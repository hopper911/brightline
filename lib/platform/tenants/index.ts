export {
  TENANT_SLUGS,
  isTenantSlug,
  parseTenantSlug,
  tenantDisplayName,
  tenantSlugFromLegacySite,
  tenantSlugFromR2Vault,
  type TenantConfig,
  type TenantSlug,
} from "@/lib/platform/tenants/types";

export {
  TENANT_HOSTNAME_ALIASES,
  TENANT_REGISTRY,
  getTenantConfig,
  getTenantPrimaryDomain,
  getTenantPublicOrigin,
  listTenants,
} from "@/lib/platform/tenants/registry";

export {
  buildHostnameToSlugMap,
  hostnameMatchesTenantDomain,
  normalizeTenantHostname,
} from "@/lib/platform/tenants/normalize-hostname";

export {
  TenantResolutionError,
  resolveTenantByHostname,
  resolveTenantByHostnameOrThrow,
  resolveTenantBySlug,
  tryResolveTenantBySlug,
  type TenantResolutionErrorCode,
} from "@/lib/platform/tenants/resolver";

export {
  ensurePlatformTenant,
  findPlatformTenantBySlug,
  type PlatformTenantRecord,
} from "@/lib/platform/tenants/repository";

export { ensurePlatformTenants } from "@/lib/platform/tenants/ensure-seeded";
