import type { TenantConfig, TenantSlug } from "@/lib/platform/tenants/types";
import { getTenantConfig } from "@/lib/platform/tenants/registry";

/** Minimal platform execution context — tenant identity only in Phase 1B. */
export type PlatformContext = {
  tenant: TenantConfig;
};

export function createPlatformContextForTenant(slug: TenantSlug): PlatformContext {
  return { tenant: getTenantConfig(slug) };
}

export function createPlatformContext(input: { tenant: TenantSlug }): PlatformContext {
  return createPlatformContextForTenant(input.tenant);
}
