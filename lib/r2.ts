/**
 * Build public R2 URL from object key.
 * Store only keys in DB; build URLs at render time.
 */
export function getPublicR2Url(key: string): string {
  if (!key) return "";
  const k = key.replace(/^\/+/, "");
  if (!k) return "";
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.BRIGHTLINE_BASE_URL ||
    "";
  const path = `/api/media/public?key=${encodeURIComponent(k)}`;
  return base ? `${base.replace(/\/+$/, "")}${path}` : path;
}

