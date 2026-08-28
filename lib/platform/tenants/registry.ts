import type { TenantConfig, TenantSlug } from "@/lib/platform/tenants/types";

/** Canonical tenant registry — single source for names and public origins. */
export const TENANT_REGISTRY: Readonly<Record<TenantSlug, TenantConfig>> = Object.freeze({
  brightline: {
    slug: "brightline",
    name: "Brightline Photography",
    publicOrigin: "https://brightlinephotography.com",
  },
  mirotech: {
    slug: "mirotech",
    name: "MiroTech Solutions",
    publicOrigin: "https://mirotech.solutions",
  },
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
