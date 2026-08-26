import { cookies, headers } from "next/headers";
import type { AccountantPermission, AccountantAccess } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { hasAdminAccess, hasAdminAccessFromRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { ACCOUNTANT_SESSION_COOKIE, ACCOUNTANT_SESSION_MAX_AGE_SEC } from "@/lib/accountant/constants";
import { verifyAccountantSessionToken, signAccountantSessionToken } from "@/lib/accountant/jwt";
import type { Prisma } from "@prisma/client";

const SALT_ROUNDS = 12;

export type PermissionKey = keyof Omit<AccountantPermission, "id" | "accountantAccessId">;

/** Owner/admin using Mission Control cookie: full finance portal access. */
const OWNER_SYNTHETIC_PERMISSIONS: Record<PermissionKey, boolean> = {
  canViewInvoices: true,
  canViewPayments: true,
  canViewExpenses: true,
  canViewTransactions: true,
  canUploadReceipts: true,
  canExportReports: true,
  canDownloadDocuments: true,
  canAddAccountingNotes: true,
  canViewProjectFinancials: true,
  canEditExpenseCategories: true,
  canCreateExpenses: true,
  canEditExpenses: true,
};

export type AccountantPortalContext =
  | {
      kind: "owner";
      permissions: Record<PermissionKey, boolean>;
      accountantAccess: null;
    }
  | {
      kind: "accountant";
      permissions: Record<PermissionKey, boolean>;
      accountantAccess: AccountantAccess & { permissions: AccountantPermission };
    };

export function permissionRecordToMap(perms: AccountantPermission): Record<PermissionKey, boolean> {
  return {
    canViewInvoices: perms.canViewInvoices,
    canViewPayments: perms.canViewPayments,
    canViewExpenses: perms.canViewExpenses,
    canViewTransactions: perms.canViewTransactions,
    canUploadReceipts: perms.canUploadReceipts,
    canExportReports: perms.canExportReports,
    canDownloadDocuments: perms.canDownloadDocuments,
    canAddAccountingNotes: perms.canAddAccountingNotes,
    canViewProjectFinancials: perms.canViewProjectFinancials,
    canEditExpenseCategories: perms.canEditExpenseCategories,
    canCreateExpenses: perms.canCreateExpenses,
    canEditExpenses: perms.canEditExpenses,
  };
}

export function assertPermission(ctx: AccountantPortalContext, key: PermissionKey): void {
  if (!ctx.permissions[key]) {
    throw Object.assign(new Error(`Forbidden: missing permission ${key}`), { status: 403 });
  }
}

export async function hashAccountantPassword(plain: string): Promise<string> {
  return hash(plain, SALT_ROUNDS);
}

export async function verifyAccountantPassword(plain: string, passwordHash: string): Promise<boolean> {
  return compare(plain, passwordHash);
}

/** RSC / server actions — read cookies from next/headers. */
export async function getAccountantPortalContext(): Promise<AccountantPortalContext | null> {
  if (await hasAdminAccess()) {
    return { kind: "owner", permissions: { ...OWNER_SYNTHETIC_PERMISSIONS }, accountantAccess: null };
  }
  const jar = await cookies();
  const token = jar.get(ACCOUNTANT_SESSION_COOKIE)?.value ?? null;
  const accessId = await verifyAccountantSessionToken(token);
  if (!accessId) return null;

  const row = await prisma.accountantAccess.findUnique({
    where: { id: accessId },
    include: { permissions: true },
  });
  if (!row?.permissions) return null;
  if (!row.isActive) return null;
  if (row.accessExpiresAt && row.accessExpiresAt.getTime() < Date.now()) return null;

  return {
    kind: "accountant",
    permissions: permissionRecordToMap(row.permissions),
    accountantAccess: row as AccountantAccess & { permissions: AccountantPermission },
  };
}

/** Route handlers — prefer request cookies for consistency with proxy. */
export async function getAccountantPortalContextFromRequest(req: Request): Promise<AccountantPortalContext | null> {
  if (hasAdminAccessFromRequest(req)) {
    return { kind: "owner", permissions: { ...OWNER_SYNTHETIC_PERMISSIONS }, accountantAccess: null };
  }
  const rawCookie = req.headers.get("cookie") ?? "";
  const token = parseCookie(rawCookie, ACCOUNTANT_SESSION_COOKIE);
  const accessId = await verifyAccountantSessionToken(token);
  if (!accessId) return null;

  const row = await prisma.accountantAccess.findUnique({
    where: { id: accessId },
    include: { permissions: true },
  });
  if (!row?.permissions) return null;
  if (!row.isActive) return null;
  if (row.accessExpiresAt && row.accessExpiresAt.getTime() < Date.now()) return null;

  return {
    kind: "accountant",
    permissions: permissionRecordToMap(row.permissions),
    accountantAccess: row as AccountantAccess & { permissions: AccountantPermission },
  };
}

function parseCookie(header: string, name: string): string | null {
  const parts = header.split(";").map((p) => p.trim());
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq === -1) continue;
    if (p.slice(0, eq).trim() !== name) continue;
    return decodeURIComponent(p.slice(eq + 1).trim());
  }
  return null;
}

export async function auditAccountantAction(input: {
  ctx: AccountantPortalContext;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  req?: Request | null;
}): Promise<void> {
  const { ctx, action, entityType, entityId, metadata, req } = input;
  let ip: string | null = null;
  let ua: string | null = null;
  if (req) {
    ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    ua = req.headers.get("user-agent");
  } else {
    const h = await headers();
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    ua = h.get("user-agent");
  }

  await prisma.accountantAuditLog.create({
    data: {
      actorType: ctx.kind,
      actorAccountantId: ctx.kind === "accountant" ? ctx.accountantAccess.id : null,
      actorOwner: ctx.kind === "owner",
      action,
      entityType: entityType ?? null,
      entityId: entityId ?? null,
      metadata: metadata ?? undefined,
      ipAddress: ip,
      userAgent: ua,
    },
  });
}

export function accountantSessionCookieOptions(req: Request): {
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
} {
  const secure =
    process.env.NODE_ENV === "production" &&
    (req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https" ||
      (() => {
        try {
          return new URL(req.url).protocol === "https:";
        } catch {
          return false;
        }
      })());
  return {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: ACCOUNTANT_SESSION_MAX_AGE_SEC,
  };
}

export async function issueAccountantSessionCookie(accessId: string, req: Request) {
  const token = await signAccountantSessionToken(accessId);
  return {
    name: ACCOUNTANT_SESSION_COOKIE,
    value: token,
    ...accountantSessionCookieOptions(req),
  };
}

export { signAccountantSessionToken };
