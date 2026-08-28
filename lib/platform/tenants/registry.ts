import type { TenantConfig, TenantSlug } from "@/lib/platform/tenants/types";
import { LEGACY_BRIGHTLINE_SITE_DOMAIN } from "@/lib/truth/brand-lock";

/** Canonical tenant registry — single source for names, domains, and public origins. */
export const TENANT_REGISTRY: Readonly<Record<TenantSlug, TenantConfig>> = Object.freeze({
  brightline: {
    slug: "brightline",
    displayName: "Brightline Photography",
    primaryDomain: "brightlinephotography.com",
    publicOrigin: "https://brightlinephotography.com",
  },
  mirotech: {
    slug: "mirotech",
    displayName: "MiroTech Solutions",
    primaryDomain: "mirotech.solutions",
    publicOrigin: "https://mirotech.solutions",
  },
});

/** Alternate hostnames that resolve to a tenant (legacy .co redirect source only). */
export const TENANT_HOSTNAME_ALIASES: Readonly<Partial<Record<string, TenantSlug>>> = Object.freeze({
  [LEGACY_BRIGHTLINE_SITE_DOMAIN]: "brightline",
});

export function getTenantConfig(slug: TenantSlug): TenantConfig {
  return TENANT_REGISTRY[slug];
}

export function listTenants(): TenantConfig[] {
  return Object.values(TENANT_REGISTRY);
}

export function getTenantPublicOrigin(slug: TenantSlug): string {
  return TENANT_REGISTRY[slug].publicOrigin;
}

export function getTenantPrimaryDomain(slug: TenantSlug): string {
  return TENANT_REGISTRY[slug].primaryDomain;
}
