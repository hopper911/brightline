import "server-only";

import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { authorizeAdminRequest, hasAdminAccess } from "@/lib/admin-auth";
import { defaultAuthorizationService } from "@/lib/platform/authorization/default-authorization-service";
import type { PlatformPermission } from "@/lib/platform/authorization/permissions";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import { getPlatformFeatures, isPlatformFeatureEnabled } from "@/lib/platform/features";
import { isLegacyAdminHandoffEnabled } from "@/lib/platform/identity/handoff-config";
import { ensureAdminPlatformUser } from "@/lib/platform/identity/link-legacy";
import { resolvePlatformUserFromLegacySession } from "@/lib/platform/identity/legacy-resolver";
import { listPlatformMembershipsForUser, findPlatformUserById } from "@/lib/platform/identity/repository";
import { readPlatformStaffUserIdFromRequest } from "@/lib/platform/identity/sso/platform-staff-session";
import { isPlatformSsoEnabled } from "@/lib/platform/identity/sso/config";
import {
  STUDIO_OPS_TENANT_COOKIE,
  studioOpsSectionVisible,
} from "@/lib/studio/ops/nav";
import type {
  StudioOpsContext,
  StudioOpsMembership,
  StudioOpsSectionId,
} from "@/lib/studio/ops/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";

function parseTenantSlug(raw: string | null | undefined): TenantSlug | null {
  const v = raw?.trim().toLowerCase();
  if (v === "brightline" || v === "mirotech") return v;
  return null;
}

function legacyAdminMemberships(): StudioOpsMembership[] {
  return [
    { tenantSlug: "brightline", role: "OWNER" },
    { tenantSlug: "mirotech", role: "OWNER" },
  ];
}

async function resolvePlatformUserId(req?: Request): Promise<string | null> {
  if (req) {
    const fromStaff = readPlatformStaffUserIdFromRequest(req);
    if (fromStaff) return fromStaff;
  }

  if (!isPlatformFeatureEnabled("identity")) return null;

  try {
    await ensureAdminPlatformUser();
  } catch {
    // non-blocking
  }

  const context = createPlatformContextForTenant("brightline");
  const user = await resolvePlatformUserFromLegacySession(context, { kind: "admin_access" });
  return user?.id ?? null;
}

export async function resolveStudioOpsContext(req?: Request): Promise<StudioOpsContext | null> {
  const authorized = req ? await authorizeAdminRequest(req) : await hasAdminAccess();
  if (!authorized) return null;

  const identityEnabled = isPlatformFeatureEnabled("identity");
  const platformFlags = getPlatformFeatures();
  const ssoAvailable = isPlatformSsoEnabled();
  const legacyHandoffEnabled = isLegacyAdminHandoffEnabled();

  let subjectKind: "legacy_admin" | "platform_user" = "legacy_admin";
  let userId: string | null = null;
  let email: string | null = null;
  let memberships: StudioOpsMembership[] = legacyAdminMemberships();
  let permissions: PlatformPermission[] = [];

  if (identityEnabled) {
    userId = await resolvePlatformUserId(req);
    if (userId) {
      subjectKind = "platform_user";
      const rows = await listPlatformMembershipsForUser(userId);
      memberships = rows.map((m) => ({ tenantSlug: m.tenantSlug, role: m.role }));
      if (!memberships.length) {
        memberships = legacyAdminMemberships();
        subjectKind = "legacy_admin";
      }
    }
  }

  const cookieStore = await cookies();
  const requestedTenant =
    parseTenantSlug(cookieStore.get(STUDIO_OPS_TENANT_COOKIE)?.value) ?? "brightline";

  const allowedTenants = new Set(memberships.map((m) => m.tenantSlug));
  const activeTenant = allowedTenants.has(requestedTenant)
    ? requestedTenant
    : (memberships[0]?.tenantSlug ?? "brightline");

  const legacyAdmin = subjectKind === "legacy_admin";
  if (identityEnabled) {
    const subject = legacyAdmin
      ? ({ kind: "legacy_admin" as const })
      : ({ kind: "user" as const, userId: userId! });
    permissions = await defaultAuthorizationService.listPermissions({
      subject,
      tenant: activeTenant,
    });
    if (userId && !email) {
      const user = await findPlatformUserById(userId);
      email = user?.email ?? process.env.ADMIN_EMAIL?.trim() ?? null;
    }
  }

  const ALL_SECTIONS: StudioOpsSectionId[] = [
    "overview",
    "brightline",
    "mirotech",
    "content",
    "media",
    "publishing",
    "system",
  ];
  const sectionIds = ALL_SECTIONS.filter((id) =>
    studioOpsSectionVisible(id, permissions, legacyAdmin)
  );

  const identityStatus = !identityEnabled
    ? "disabled"
    : userId
      ? "ok"
      : "misconfigured";

  const ssoStatus = !identityEnabled
    ? "disabled"
    : ssoAvailable
      ? "ok"
      : "misconfigured";

  const publishingStatus = platformFlags.publishing ? "ok" : "disabled";
  const jobsStatus = platformFlags.jobs ? "ok" : "disabled";

  return {
    ok: true,
    subjectKind,
    userId,
    email,
    activeTenant,
    memberships,
    permissions,
    identityEnabled,
    ssoAvailable,
    legacyHandoffEnabled,
    sections: sectionIds,
    platformFlags: {
      content: platformFlags.content,
      media: platformFlags.media,
      publishing: platformFlags.publishing,
      identity: platformFlags.identity,
      jobs: platformFlags.jobs,
      audit: platformFlags.audit,
    },
    systemStatus: {
      identity: identityStatus,
      sso: ssoStatus,
      publishing: publishingStatus,
      jobs: jobsStatus,
    },
  };
}

export function readStudioOpsTenantFromRequest(req: NextRequest): TenantSlug {
  const raw = req.cookies.get(STUDIO_OPS_TENANT_COOKIE)?.value;
  return parseTenantSlug(raw) ?? "brightline";
}

export function tenantAllowedForMemberships(
  tenant: TenantSlug,
  memberships: StudioOpsMembership[]
): boolean {
  return memberships.some((m) => m.tenantSlug === tenant);
}
