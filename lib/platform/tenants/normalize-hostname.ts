import type { TenantSlug } from "@/lib/platform/tenants/types";

/** Normalize a hostname or Host header value for tenant lookup. */
export function normalizeTenantHostname(raw: string): string {
  let host = raw.trim().toLowerCase();
  if (!host) return "";

  // Host header may include port.
  const colon = host.indexOf(":");
  if (colon > -1) host = host.slice(0, colon);

  host = host.replace(/\.$/, "");
  if (host.startsWith("www.")) host = host.slice(4);
  return host;
}

export function hostnameMatchesTenantDomain(hostname: string, primaryDomain: string): boolean {
  const normalized = normalizeTenantHostname(hostname);
  return normalized === primaryDomain.toLowerCase();
}

export function buildHostnameToSlugMap(
  tenants: ReadonlyArray<{ slug: TenantSlug; primaryDomain: string }>,
  aliases: Readonly<Partial<Record<string, TenantSlug>>>
): Readonly<Record<string, TenantSlug>> {
  const map: Record<string, TenantSlug> = {};
  for (const tenant of tenants) {
    map[tenant.primaryDomain.toLowerCase()] = tenant.slug;
  }
  for (const [alias, slug] of Object.entries(aliases)) {
    if (slug) map[alias.toLowerCase()] = slug;
  }
  return Object.freeze(map);
}
