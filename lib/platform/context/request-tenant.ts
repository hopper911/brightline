import "server-only";

import { resolveTenantByHostname } from "@/lib/platform/tenants/resolver";
import type { TenantConfig } from "@/lib/platform/tenants/types";

function readRequestHost(request: Request): string | null {
  const direct = request.headers.get("host")?.trim();
  if (direct) return direct;

  const forwarded = request.headers.get("x-forwarded-host")?.trim();
  if (!forwarded) return null;

  // Use the first host when a proxy forwards a comma-separated list.
  return forwarded.split(",")[0]?.trim() || null;
}

/**
 * Resolve tenant from an incoming HTTP request Host header.
 * Helper only — does not alter routing, redirects, or middleware.
 */
export function resolveTenantFromRequest(request: Request): TenantConfig | null {
  const host = readRequestHost(request);
  if (!host) return null;
  return resolveTenantByHostname(host);
}

/** Alias for resolveTenantFromRequest — same null-on-unknown semantics. */
export function getRequestTenant(request: Request): TenantConfig | null {
  return resolveTenantFromRequest(request);
}
