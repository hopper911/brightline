import { CANONICAL_SITE_ORIGIN } from "@/lib/truth/brand-lock";
import { mirotechSiteOrigin } from "@/lib/mirotech-site";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import type { SsoAudience } from "@/lib/platform/identity/sso/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";

export function brightlineSiteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
    process.env.SITE_URL?.trim().replace(/\/$/, "") ||
    CANONICAL_SITE_ORIGIN
  );
}

export function siteOriginForTenant(tenant: TenantSlug): string {
  if (tenant === "mirotech") return mirotechSiteOrigin();
  return brightlineSiteOrigin();
}

/** Conceptual SSO authority — existing Mirotech deploy (no new auth.* subdomain in 8C). */
export function ssoAuthorityOriginForAudience(audience: SsoAudience): string {
  return siteOriginForTenant(audience);
}

export function isPlatformSsoConfigured(): boolean {
  const secret = process.env.PLATFORM_SSO_EXCHANGE_SECRET?.trim() || "";
  return secret.length >= 32;
}

export function isPlatformSsoEnabled(): boolean {
  return isPlatformFeatureEnabled("identity") && isPlatformSsoConfigured();
}
