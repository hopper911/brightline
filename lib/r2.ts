/**
 * Build public R2 URL from object key.
 * Store only keys in DB; build URLs at render time.
 */
export function getPublicR2Url(key: string): string {
  if (!key) return "";
  const k = key.replace(/^\/+/, "");
  if (!k) return "";
  return `/api/media/public?key=${encodeURIComponent(k)}`;
}

