import "server-only";

import type { PlatformContext } from "@/lib/platform/context/types";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import { defaultIdentityService } from "@/lib/platform/identity/default-identity-service";
import type { IdentityService } from "@/lib/platform/identity/identity-service";
import type { LegacyIdentityInput, PlatformUserRecord } from "@/lib/platform/identity/types";

export type LegacySessionInput = LegacyIdentityInput;

/**
 * Map an already-authenticated legacy session to a PlatformUser when a link exists.
 *
 * - Does NOT validate cookies, JWTs, or access codes
 * - Returns null when identity flag is off or no mapping exists
 * - Never throws for unmapped sessions (legacy auth continues unchanged)
 */
export async function resolvePlatformUserFromLegacySession(
  context: PlatformContext,
  input: LegacySessionInput,
  identityService: IdentityService = defaultIdentityService
): Promise<PlatformUserRecord | null> {
  if (!isPlatformFeatureEnabled("identity")) {
    return null;
  }

  try {
    return await identityService.resolveLegacyIdentity(context, input);
  } catch {
    return null;
  }
}
