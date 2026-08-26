/**
 * R2 key prefix policy: public marketing assets vs private client vault paths.
 * Keep in sync with `/api/media/public` and admin preview signing.
 */

/** Anonymous `/api/media/public` — portfolio, site CMS, legacy Lightroom sections only. */
export const PUBLIC_MEDIA_PREFIXES = [
  "portfolio/",
  "mirotech/",
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

/** Private vault — require admin session or client/package token to sign. Never expose via `/api/media/public`. */
export const PRIVATE_MEDIA_PREFIXES = ["client-galleries/", "delivery/", "accounting/"] as const;

/** Additional prefixes admins may sign via upload/storage helpers. */
export const ADMIN_SIGNABLE_EXTRA_PREFIXES = [
  "journal/",
  "tmp/",
  "studio-os/",
] as const;

/** Studio Hub receipt objects (subset of studio-os/). */
export const STUDIO_RECEIPTS_PREFIX = "studio-os/receipts/";

export function isStudioReceiptKey(key: string): boolean {
  const clean = normalizeMediaKey(key);
  return Boolean(clean) && !clean.includes("..") && clean.startsWith(STUDIO_RECEIPTS_PREFIX);
}

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

export function isAdminSignableMediaKey(key: string): boolean {
  const clean = normalizeMediaKey(key);
  if (!clean || clean.includes("..")) return false;
  return (
    isPublicMediaKey(key) ||
    isPrivateMediaKey(key) ||
    ADMIN_SIGNABLE_EXTRA_PREFIXES.some((prefix) => clean.startsWith(prefix))
  );
}
