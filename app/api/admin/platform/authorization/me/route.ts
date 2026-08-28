import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { defaultAuthorizationService } from "@/lib/platform/authorization/default-authorization-service";
import { isAuthorizationError } from "@/lib/platform/authorization/errors";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import { resolvePlatformUserFromLegacySession } from "@/lib/platform/identity/legacy-resolver";
import type { TenantSlug } from "@/lib/platform/tenants/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseTenantParam(url: URL): TenantSlug {
  const raw = url.searchParams.get("tenant")?.trim().toLowerCase();
  if (raw === "mirotech") return "mirotech";
  return "brightline";
}

/** Effective permissions for legacy admin or mapped PlatformUser (dual-auth probe). */
export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!isPlatformFeatureEnabled("identity")) {
    return NextResponse.json({
      ok: true,
      rbacEnabled: false,
      tenant: "brightline",
      permissions: [],
    });
  }

  const tenant = parseTenantParam(new URL(req.url));
  const context = createPlatformContextForTenant(tenant);
  const user = await resolvePlatformUserFromLegacySession(context, { kind: "admin_access" });
  const subject = user
    ? ({ kind: "user" as const, userId: user.id })
    : ({ kind: "legacy_admin" as const });

  try {
    await defaultAuthorizationService.requirePermission({
      subject,
      tenant,
      permission: "platform.identity.read",
    });
  } catch (error) {
    if (isAuthorizationError(error) && error.code === "FORBIDDEN") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }

  const permissions = await defaultAuthorizationService.listPermissions({ subject, tenant });

  return NextResponse.json({
    ok: true,
    rbacEnabled: true,
    tenant,
    subjectKind: subject.kind,
    permissions,
  });
}
