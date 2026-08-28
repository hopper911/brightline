/**
 * Platform tenant identifiers — stable slugs for Brightline + Mirotech.
 * Do not scatter string literals for tenant routing across the codebase.
 */

export const TENANT_SLUGS = ["brightline", "mirotech"] as const;

export type TenantSlug = (typeof TENANT_SLUGS)[number];

export type TenantConfig = {
  slug: TenantSlug;
  name: string;
  /** Canonical public site origin (no trailing slash). */
  publicOrigin: string;
};

export function isTenantSlug(value: unknown): value is TenantSlug {
  return typeof value === "string" && (TENANT_SLUGS as readonly string[]).includes(value);
}

export function parseTenantSlug(value: unknown): TenantSlug | null {
  if (!isTenantSlug(value)) return null;
  return value;
}

/** Map legacy dual-brand / vault string labels to platform tenant slugs. */
export function tenantSlugFromLegacySite(site: string): TenantSlug | null {
  const normalized = site.trim().toLowerCase();
  if (normalized === "brightline" || normalized === "brightline-work") return "brightline";
  if (normalized === "mirotech" || normalized === "mirotech-work" || normalized === "mirotech-site") {
    return "mirotech";
  }
  return parseTenantSlug(normalized);
}

/** Map R2 vault id to owning tenant (both vaults are operated from Brightline admin). */
export function tenantSlugFromR2Vault(vault: "brightline" | "mirotech-site"): TenantSlug {
  return vault === "mirotech-site" ? "mirotech" : "brightline";
}
