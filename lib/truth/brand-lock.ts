/**
 * Brand / service-area lock — permanent.
 * Source of truth for locations remains BRAND.contact.locations;
 * this module freezes the required set so it cannot silently shrink.
 */

/** Canonical public site — always use .com in new code, env vars, and docs. */
export const CANONICAL_SITE_ORIGIN = "https://brightlinephotography.com" as const;
export const CANONICAL_SITE_DOMAIN = "brightlinephotography.com" as const;

export const CANONICAL_MEDIA_ORIGIN = "https://media.brightlinephotography.com" as const;
export const CANONICAL_MEDIA_HOST = "media.brightlinephotography.com" as const;

export const CANONICAL_IMAGES_HOST = "images.brightlinephotography.com" as const;

/**
 * Legacy .co domain — redirect / hostname-alias only. Do NOT use in URLs, env, or email.
 * Kept in vercel.json redirects and tenant hostname resolution for inbound legacy traffic.
 */
export const LEGACY_BRIGHTLINE_SITE_DOMAIN = "brightlinephotography.co" as const;

export const LEGACY_BRIGHTLINE_CO_HOSTS = Object.freeze([
  LEGACY_BRIGHTLINE_SITE_DOMAIN,
  "www.brightlinephotography.co",
  "media.brightlinephotography.co",
  "images.brightlinephotography.co",
] as const);

export function isLegacyBrightlineCoHost(host: string): boolean {
  const h = host.toLowerCase();
  if ((LEGACY_BRIGHTLINE_CO_HOSTS as readonly string[]).includes(h)) return true;
  return h.endsWith(".brightlinephotography.co");
}

/** True for canonical .com or legacy .co Brightline hosts (read/trust existing stored URLs). */
export function isBrightlineSiteHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === CANONICAL_SITE_DOMAIN || h.endsWith(`.${CANONICAL_SITE_DOMAIN}`)) return true;
  return isLegacyBrightlineCoHost(h);
}

export const SERVICE_AREA_LOCATIONS = Object.freeze([
  "New York City",
  "Brooklyn",
  "Jersey City",
  "Hoboken",
  "New Jersey",
  "Tri-State Area",
] as const);

export const LEGAL_STUDIO_NAME = "BRIGHTLINE Photography" as const;
