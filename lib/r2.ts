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
  if (!stored?.trim()) return "";
  const raw = stored.trim();
  if (raw.startsWith("blob:") || raw.startsWith("data:")) return raw;
  if (raw.startsWith("/api/media/public")) return withCanvasProxy(raw);

  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      if (isTrustedR2Host(u.hostname)) {
        const pathKey = decodeURIComponent(u.pathname.replace(/^\/+/, ""));
        if (pathKey) {
          return withCanvasProxy(`/api/media/public?key=${encodeURIComponent(pathKey)}`);
        }
      }
      const pathKey = u.pathname.replace(/^\/+/, "");
      if (pathKey && !isTrustedR2Host(u.hostname)) {
        return withCanvasProxy(`/api/media/public?key=${encodeURIComponent(pathKey)}`);
      }
      return raw;
    } catch {
      return "";
    }
  }

  return withCanvasProxy(getPublicR2Url(raw));
}
