import "server-only";

import type { AuthorizationSubject } from "@/lib/platform/authorization/types";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import { resolvePlatformUserFromLegacySession } from "@/lib/platform/identity/legacy-resolver";

export async function resolveStudioAuthorizationSubject(): Promise<AuthorizationSubject> {
  if (!isPlatformFeatureEnabled("identity")) {
    return { kind: "legacy_admin" };
  }

  const context = createPlatformContextForTenant("brightline");
  const user = await resolvePlatformUserFromLegacySession(context, { kind: "admin_access" });
  if (user) {
    return { kind: "user", userId: user.id };
  }
  return { kind: "legacy_admin" };
}
