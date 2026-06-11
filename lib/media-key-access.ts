/**
 * R2 key prefix policy: public marketing assets vs private client vault paths.
 * Keep in sync with `/api/media/public` and admin preview signing.
 */

/** Anonymous `/api/media/public` — portfolio, site CMS, legacy Lightroom sections only. */
export const PUBLIC_MEDIA_PREFIXES = [
  "portfolio/",
  "portfolio-public/",
  "work/",
  "studio/",
  "site/",
  "acd/",
  "rea/",
  "cul/",
  "biz/",
  "tri/",
  "thumb/",
] as const;

/** Private client vault — require admin session or client/package token to sign. */
export const PRIVATE_MEDIA_PREFIXES = ["client-galleries/"] as const;

export function normalizeMediaKey(key: string): string {
  return key.trim().replace(/^\/+/, "").toLowerCase();
}

export function isPublicMediaKey(key: string): boolean {
  const clean = normalizeMediaKey(key);
  return PUBLIC_MEDIA_PREFIXES.some((prefix) => clean.startsWith(prefix));
}

export function isPrivateMediaKey(key: string): boolean {
  const clean = normalizeMediaKey(key);
  return PRIVATE_MEDIA_PREFIXES.some((prefix) => clean.startsWith(prefix));
}

export function isAllowedPublicMediaKey(key: string): boolean {
  return isPublicMediaKey(key);
}
