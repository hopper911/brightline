/**
 * Legacy Mirotech admin handoff (ho1) — parallel to SSO until Phase 8D cutover.
 * Defaults ON so existing nav keeps working when unset.
 */

function parseEnvFlag(name: string, defaultWhenUnset: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return defaultWhenUnset;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

/** When false, Brightline must not mint new ho1 handoff tokens (SSO preferred). */
export function isLegacyAdminHandoffEnabled(): boolean {
  return parseEnvFlag("LEGACY_ADMIN_HANDOFF_ENABLED", true);
}
