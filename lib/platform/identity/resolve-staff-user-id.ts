import "server-only";

import { authorizeAdminRequest } from "@/lib/admin-auth";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import { ensureAdminPlatformUser } from "@/lib/platform/identity/link-legacy";
import { resolvePlatformUserFromLegacySession } from "@/lib/platform/identity/legacy-resolver";
import { readPlatformStaffUserIdFromRequest } from "@/lib/platform/identity/sso/platform-staff-session";

/**
 * Resolve PlatformUser id for staff SSO when ps1 is absent but legacy admin is valid.
 * Does not validate admin cookie — callers must gate on authorizeAdminRequest first when needed.
 */
export async function resolveStaffUserIdForCrossDomainSso(req: Request): Promise<string | null> {
  const fromSession = readPlatformStaffUserIdFromRequest(req);
  if (fromSession) return fromSession;

  if (!isPlatformFeatureEnabled("identity")) return null;
  if (!(await authorizeAdminRequest(req))) return null;

  try {
    await ensureAdminPlatformUser();
  } catch {
    // non-blocking
  }

  const context = createPlatformContextForTenant("brightline");
  const user = await resolvePlatformUserFromLegacySession(context, { kind: "admin_access" });
  return user?.id ?? null;
}
