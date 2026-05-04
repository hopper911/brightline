/**
 * Build public R2 URL from object key.
 * Store only keys in DB; build URLs at render time.
 * If the DB already holds a full https URL to our R2/public host, pass it through for img src.
 */

function isTrustedR2Host(hostname: string): boolean {
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
