import {
  TENANT_HOSTNAME_ALIASES,
  TENANT_REGISTRY,
  getTenantConfig,
  listTenants,
} from "@/lib/platform/tenants/registry";
import {
  buildHostnameToSlugMap,
  normalizeTenantHostname,
} from "@/lib/platform/tenants/normalize-hostname";
import { parseTenantSlug, type TenantConfig } from "@/lib/platform/tenants/types";

export type TenantResolutionErrorCode = "unknown_tenant" | "invalid_hostname";

export class TenantResolutionError extends Error {
  readonly code: TenantResolutionErrorCode;

  constructor(message: string, code: TenantResolutionErrorCode) {
    super(message);
    this.name = "TenantResolutionError";
    this.code = code;
  }
}

const HOSTNAME_TO_SLUG = buildHostnameToSlugMap(listTenants(), TENANT_HOSTNAME_ALIASES);

/** Canonical slug resolution — throws on unknown slug strings. */
export function resolveTenantBySlug(slug: string): TenantConfig {
  const parsed = parseTenantSlug(slug);
  if (!parsed) {
    throw new TenantResolutionError(`Unknown tenant slug: ${slug}`, "unknown_tenant");
  }
  return getTenantConfig(parsed);
}

/** Slug resolution without throwing — returns null for unknown slugs. */
export function tryResolveTenantBySlug(slug: string): TenantConfig | null {
  const parsed = parseTenantSlug(slug);
  return parsed ? getTenantConfig(parsed) : null;
}

/**
 * Hostname convenience adapter — returns null for unknown hosts.
 * Does not default unknown domains to Brightline or MiroTech.
 */
export function resolveTenantByHostname(hostname: string): TenantConfig | null {
  const normalized = normalizeTenantHostname(hostname);
  if (!normalized) {
    return null;
  }
  const slug = HOSTNAME_TO_SLUG[normalized];
  if (!slug) {
    return null;
  }
  return TENANT_REGISTRY[slug];
}

/** Hostname resolution — throws when the host cannot be mapped. */
export function resolveTenantByHostnameOrThrow(hostname: string): TenantConfig {
  const tenant = resolveTenantByHostname(hostname);
  if (!tenant) {
    throw new TenantResolutionError(
      `Unknown tenant hostname: ${hostname}`,
      "invalid_hostname"
    );
  }
  return tenant;
}
