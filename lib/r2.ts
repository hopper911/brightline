/**
 * Build public R2 URL from object key.
 * Store only keys in DB; build URLs at render time.
 * If the DB already holds a full https URL to our R2/public host, pass it through for img src.
 */

import { preferPortfolioWebFullKey, preferPortfolioWebThumbKey } from "@/lib/portfolio-web-full";
import { extractPublicMediaKey } from "@/lib/r2-key";

export { extractPublicMediaKey, isTrustedR2Host } from "@/lib/r2-key";

/** Mirotech CMS CDN — must not be rewritten to Brightline `/api/media/public`. */
export function isMirotechSitePublicUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    const h = u.hostname.toLowerCase();
    return h === "media.mirotech.solutions" || h.endsWith(".mirotech.solutions");
  } catch {
    return false;
  }
}

/** Canonical browser URL for a stored media reference. */
export function resolveStoredMediaUrl(stored: string | null | undefined): string {
  if (!stored?.trim()) return "";
  const raw = stored.trim();
  if (raw.startsWith("blob:") || raw.startsWith("data:")) return raw;
  if (raw.startsWith("/") && !raw.startsWith("/api/media/public")) return raw;

  // Pass through Mirotech site CDN URLs — they live in a separate R2 bucket.
  if (/^https?:\/\//i.test(raw) && isMirotechSitePublicUrl(raw)) {
    return raw;
  }

  const key = extractPublicMediaKey(raw);
  if (!key) {
    return /^https?:\/\//i.test(raw) ? raw : "";
  }
  // Never put a URL in `?key=` — that 400s the public media route.
  if (/^https?:\/\//i.test(key)) {
    return /^https?:\/\//i.test(raw) ? raw : "";
  }
  return `/api/media/public?key=${encodeURIComponent(key)}`;
}

export function getPublicR2Url(key: string): string {
  return resolveStoredMediaUrl(key);
}

/** Full-bleed / hero / page background — prefer ~2400px web_full over ~800px web_thumb. */
export function resolveFullBleedMediaUrl(stored: string | null | undefined): string {
  if (!stored?.trim()) return "";
  return resolveStoredMediaUrl(preferPortfolioWebFullKey(stored.trim()));
}

export function getPublicR2FullBleedUrl(key: string): string {
  return resolveFullBleedMediaUrl(key);
}

/** Listing cards / grids — ~800px web_thumb tier (Phase 15B). */
export function resolveCardMediaUrl(stored: string | null | undefined): string {
  if (!stored?.trim()) return "";
  return resolveStoredMediaUrl(preferPortfolioWebThumbKey(stored.trim()));
}

export function getPublicR2CardUrl(key: string): string {
  return resolveCardMediaUrl(key);
}

/** Append `proxy=1` so the handler streams bytes instead of 302 (canvas-safe). */
function withCanvasProxy(mediaPublicPath: string): string {
  if (!mediaPublicPath.startsWith("/api/media/public")) return mediaPublicPath;
  if (mediaPublicPath.includes("proxy=1")) return mediaPublicPath;
  const sep = mediaPublicPath.includes("?") ? "&" : "?";
  return `${mediaPublicPath}${sep}proxy=1`;
}

/**
 * Image URL suitable for canvas read (same-origin). Trusted full HTTPS URLs are rewritten to `/api/media/public?key=…&proxy=1`.
 */
export function getCropSafeMediaUrl(stored: string | null | undefined): string {
  const resolved = resolveStoredMediaUrl(stored);
  if (!resolved) return "";
  if (resolved.startsWith("blob:") || resolved.startsWith("data:")) return resolved;
  if (resolved.startsWith("/api/media/public")) return withCanvasProxy(resolved);
  return resolved;
}
