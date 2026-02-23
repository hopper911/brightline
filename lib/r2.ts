/**
 * Build public R2 URL from object key.
 * Store only keys in DB; build URLs at render time.
 */
export function getPublicR2Url(key: string): string {
  if (!key) return "";
  const base =
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
    process.env.R2_PUBLIC_URL ||
    "";
  const clean = base.replace(/\/+$/, "");
  const k = key.replace(/^\/+/, "");
  return k ? `${clean}/${k}` : clean;
}
