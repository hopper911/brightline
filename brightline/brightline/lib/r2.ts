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
  return r2UrlFromKey(base, key);
}

export function isR2Key(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

/**
 * Derive the thumbnail key from a full key.
 *
 * R2 structure: portfolio/{section}/web_full/{filename}.{ext}
 * Returns:       portfolio/{section}/web_thumb/{filename}.webp
 *
 * Example:
 *   portfolio/arc/web_full/bl-arch-cs-nyc-26-001.jpg
 *   → portfolio/arc/web_thumb/bl-arch-cs-nyc-26-001.webp
 */
export function deriveThumbKeyFromFullKey(fullKey: string): string {
  const key = fullKey.replace(/^\/+/, "");

  const withThumbSegment = key.replace("/web_full/", "/web_thumb/");
  const noExt = withThumbSegment.replace(/\.[^/.]+$/, "");
  return `${noExt}.webp`;
}

/**
 * Prefer keyThumb if present; otherwise derive from keyFull.
 */
export function getThumbKey(
  keyFull?: string | null,
  keyThumb?: string | null
): string | null {
  if (isR2Key(keyThumb)) return keyThumb;
  if (isR2Key(keyFull)) return deriveThumbKeyFromFullKey(keyFull);
  return null;
}

/**
 * Build R2 URL from base URL and key.
 * Prefer for grids: pass r2PublicUrl explicitly.
 */
export function r2UrlFromKey(r2PublicUrl: string, key: string): string {
  if (!key) return r2PublicUrl.replace(/\/+$/, "");
  const base = r2PublicUrl.replace(/\/+$/, "");
  const k = key.replace(/^\/+/, "");
  return k ? `${base}/${k}` : base;
}

/** Base URL for R2 public assets. */
function getR2BaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
    process.env.R2_PUBLIC_URL ||
    ""
  );
}

/**
 * Best URL for grid/card display: thumb first (WebP, fast), full fallback.
 */
export function getGridImageUrl(
  keyFull?: string | null,
  keyThumb?: string | null
): string {
  const base = getR2BaseUrl();
  const thumbKey = getThumbKey(keyFull, keyThumb);
  const fullKey = keyFull ?? null;
  return (
    (thumbKey ? r2UrlFromKey(base, thumbKey) : null) ??
    (fullKey ? r2UrlFromKey(base, fullKey) : null) ??
    ""
  );
}

