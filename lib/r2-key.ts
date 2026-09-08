/**
 * Leaf helpers for public media keys — kept free of URL builders so client-safe
 * modules (blog-post-model) do not pull the full R2 URL layer into webpack cycles.
 */

import {
  CANONICAL_IMAGES_HOST,
  isLegacyBrightlineCoHost,
} from "@/lib/truth/brand-lock";

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
