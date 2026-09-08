/**
 * Build public R2 URL from object key.
 * Store only keys in DB; build URLs at render time.
 * If the DB already holds a full https URL to our R2/public host, pass it through for img src.
 */

import {
  CANONICAL_IMAGES_HOST,
  isLegacyBrightlineCoHost,
} from "@/lib/truth/brand-lock";
import { preferPortfolioWebFullKey, preferPortfolioWebThumbKey } from "@/lib/portfolio-web-full";

export function isTrustedR2Host(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h.endsWith(".r2.dev") ||
    h.endsWith(".r2.cloudflarestorage.com") ||
    h === CANONICAL_IMAGES_HOST ||
    isLegacyBrightlineCoHost(h) ||
    h === "mirotech.solutions" ||
    h.endsWith(".mirotech.solutions")
  );
}

function safeDecodeUri(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function readApiMediaKeyFromUrl(raw: string): string | null {
  try {
    const u = new URL(raw, "https://brightline.local");
    const path = u.pathname.replace(/\/$/, "");
    if (path !== "/api/media/public") return null;
    const key = u.searchParams.get("key")?.trim();
    if (!key) return null;
    return safeDecodeUri(key).replace(/^\/+/, "");
  } catch {
    return null;
  }
}

function objectKeyFromTrustedUrl(url: URL): string | null {
  let pathKey = safeDecodeUri(url.pathname.replace(/^\/+/, ""));
  if (!pathKey) return null;
  // Path-style S3: account.r2.cloudflarestorage.com/{bucket}/{key}
  if (url.hostname.toLowerCase().endsWith(".r2.cloudflarestorage.com")) {
    const slash = pathKey.indexOf("/");
    if (slash > 0) pathKey = pathKey.slice(slash + 1);
  }
  return pathKey || null;
}

function unwrapPublicMediaKey(raw: string, depth: number): string | null {
  if (!raw || depth > 6) return null;

  const fromApi = readApiMediaKeyFromUrl(raw);
  if (fromApi) {
    if (/^https?:\/\//i.test(fromApi) || fromApi.startsWith("/")) {
      return unwrapPublicMediaKey(fromApi, depth + 1);
    }
    return fromApi.replace(/^\/+/, "") || null;
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      const nestedKey = u.searchParams.get("key")?.trim();
      if (nestedKey) {
        const decoded = safeDecodeUri(nestedKey).replace(/^\/+/, "");
        const nested = unwrapPublicMediaKey(decoded, depth + 1);
        if (nested) return nested;
      }
      if (isTrustedR2Host(u.hostname)) {
        return objectKeyFromTrustedUrl(u);
      }
    } catch {
      return null;
    }
    return null;
  }

  const key = raw.replace(/^\/+/, "");
  return key || null;
}

/** Extract the R2 object key from a stored media reference (raw key, proxy path, or full URL). */
export function extractPublicMediaKey(stored: string): string | null {
  const raw = stored.trim();
  if (!raw) return null;
  return unwrapPublicMediaKey(raw, 0);
}

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
