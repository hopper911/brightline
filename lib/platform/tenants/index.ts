export {
  TENANT_SLUGS,
  isTenantSlug,
  parseTenantSlug,
  tenantSlugFromLegacySite,
  tenantSlugFromR2Vault,
  type TenantConfig,
  type TenantSlug,
} from "@/lib/platform/tenants/types";

export {
  TENANT_REGISTRY,
  getTenantConfig,
  getTenantPublicOrigin,
  listTenants,
} from "@/lib/platform/tenants/registry";

export { ensurePlatformTenants } from "@/lib/platform/tenants/ensure-seeded";
