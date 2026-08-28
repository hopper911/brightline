import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import { isPlatformSsoConfigured } from "@/lib/platform/identity/sso/config";
import { readPlatformStaffUserIdFromRequest } from "@/lib/platform/identity/sso/platform-staff-session";
import { resolveSsoStaffIdentity } from "@/lib/platform/identity/sso/resolve-sso-staff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** SSO availability probe — does not redirect or force cutover. */
export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const identityEnabled = isPlatformFeatureEnabled("identity");
  const ssoConfigured = isPlatformSsoConfigured();
  const staffUserId = readPlatformStaffUserIdFromRequest(req);

  let staff = null;
  if (staffUserId && identityEnabled) {
    const resolved = await resolveSsoStaffIdentity(staffUserId, "brightline");
    if (resolved.ok) {
      staff = {
        userId: resolved.staff.userId,
        email: resolved.staff.email,
        memberships: resolved.staff.memberships,
        permissions: resolved.permissions,
      };
    }
  }

  return NextResponse.json({
    ok: true,
    identityEnabled,
    ssoConfigured,
    ssoAvailable: identityEnabled && ssoConfigured,
    legacyFallback: true,
    staffSession: Boolean(staffUserId),
    staff,
  });
}
