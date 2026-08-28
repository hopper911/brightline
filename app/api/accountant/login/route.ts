import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  auditAccountantAction,
  issueAccountantSessionCookie,
  verifyAccountantPassword,
} from "@/lib/accountant/auth";
import { ensureAccountantPlatformUser } from "@/lib/platform/identity/link-legacy";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (await isRateLimitedAsync(ip, { scope: "accountant-login", max: 8, windowMs: 15 * 60_000 })) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const row = await prisma.accountantAccess.findUnique({
    where: { email },
    include: { permissions: true },
  });

  if (!row?.permissions) {
    return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 401 });
  }
  if (!row.isActive) {
    return NextResponse.json({ ok: false, error: "Account is disabled." }, { status: 403 });
  }
  if (row.accessExpiresAt && row.accessExpiresAt.getTime() < Date.now()) {
    return NextResponse.json({ ok: false, error: "Access has expired." }, { status: 403 });
  }

  const pwOk = await verifyAccountantPassword(parsed.data.password, row.passwordHash);
  if (!pwOk) {
    return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 401 });
  }

  await prisma.accountantAccess.update({
    where: { id: row.id },
    data: { lastLoginAt: new Date() },
  });

  const ctx = {
    kind: "accountant" as const,
    accountantAccess: row,
    permissions: {
      canViewInvoices: row.permissions.canViewInvoices,
      canViewPayments: row.permissions.canViewPayments,
      canViewExpenses: row.permissions.canViewExpenses,
      canViewTransactions: row.permissions.canViewTransactions,
      canUploadReceipts: row.permissions.canUploadReceipts,
      canExportReports: row.permissions.canExportReports,
      canDownloadDocuments: row.permissions.canDownloadDocuments,
      canAddAccountingNotes: row.permissions.canAddAccountingNotes,
      canViewProjectFinancials: row.permissions.canViewProjectFinancials,
      canEditExpenseCategories: row.permissions.canEditExpenseCategories,
      canCreateExpenses: row.permissions.canCreateExpenses,
      canEditExpenses: row.permissions.canEditExpenses,
    },
  };

  await auditAccountantAction({
    ctx,
    action: "accountant.login",
    metadata: { email: row.email },
    req,
  });

  void ensureAccountantPlatformUser({
    accountantAccessId: row.id,
    email: row.email,
  }).catch((err) => {
    console.error("ACCOUNTANT_PLATFORM_IDENTITY_LINK_ERROR", err);
  });

  const cookie = await issueAccountantSessionCookie(row.id, req);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookie.name, cookie.value, {
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    secure: cookie.secure,
    path: cookie.path,
    maxAge: cookie.maxAge,
  });
  return res;
}
