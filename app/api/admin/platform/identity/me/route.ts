import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import { defaultIdentityService } from "@/lib/platform/identity/default-identity-service";
import { resolvePlatformUserFromLegacySession } from "@/lib/platform/identity/legacy-resolver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin identity probe — returns mapped PlatformUser when a legacy link exists. */
export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const identityEnabled = isPlatformFeatureEnabled("identity");
  if (!identityEnabled) {
    return NextResponse.json({
      ok: true,
      identityEnabled: false,
      user: null,
      memberships: [],
    });
  }

  const context = createPlatformContextForTenant("brightline");
  const user = await resolvePlatformUserFromLegacySession(context, { kind: "admin_access" });
  const memberships = user
    ? await defaultIdentityService.getMemberships(context, user.id)
    : [];

  return NextResponse.json({
    ok: true,
    identityEnabled: true,
    user,
    memberships,
  });
}
