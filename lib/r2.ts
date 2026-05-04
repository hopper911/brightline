/**
 * Build public R2 URL from object key.
 * Store only keys in DB; build URLs at render time.
 * If the DB already holds a full https URL to our R2/public host, pass it through for img src.
 */

export function isTrustedR2Host(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h.endsWith(".r2.dev") ||
    h.endsWith(".r2.cloudflarestorage.com") ||
    h === "images.brightlinephotography.co"
  );
}

export function getPublicR2Url(key: string): string {
  if (!key) return "";
  const raw = key.trim();
  if (!raw) return "";

  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      if (isTrustedR2Host(u.hostname)) {
        return raw;
      }
      const pathKey = u.pathname.replace(/^\/+/, "");
      if (pathKey) {
        return `/api/media/public?key=${encodeURIComponent(pathKey)}`;
      }
      return "";
    } catch {
      return "";
    }
  }

  const k = raw.replace(/^\/+/, "");
  if (!k) return "";
  return `/api/media/public?key=${encodeURIComponent(k)}`;
}

/**
 * Image URL suitable for canvas read (same-origin). Trusted full HTTPS URLs are rewritten to `/api/media/public?key=…`.
 */
export function getCropSafeMediaUrl(stored: string | null | undefined): string {
  if (!stored?.trim()) return "";
  const raw = stored.trim();
  if (raw.startsWith("blob:") || raw.startsWith("data:")) return raw;
  if (raw.startsWith("/api/media/public")) return raw;

  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      if (isTrustedR2Host(u.hostname)) {
        const pathKey = decodeURIComponent(u.pathname.replace(/^\/+/, ""));
        if (pathKey) return `/api/media/public?key=${encodeURIComponent(pathKey)}`;
      }
      const pathKey = u.pathname.replace(/^\/+/, "");
      if (pathKey && !isTrustedR2Host(u.hostname)) {
        return `/api/media/public?key=${encodeURIComponent(pathKey)}`;
      }
      return raw;
    } catch {
      return "";
    }
  }

  return getPublicR2Url(raw);
}
