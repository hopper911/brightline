/**
 * Legacy Mirotech admin handoff (ho1) — parallel to SSO until Phase 8D cutover.
 * Defaults ON so existing nav keeps working when unset.
 */

import { LEGACY_HANDOFF_FLAG, parsePlatformEnvFlag } from "@/lib/platform/features";

/** When false, Brightline must not mint new ho1 handoff tokens (SSO preferred). */
export function isLegacyAdminHandoffEnabled(): boolean {
  return parsePlatformEnvFlag(LEGACY_HANDOFF_FLAG.env, LEGACY_HANDOFF_FLAG.defaultWhenUnset);
}
