/**
 * When listing cards rewrite web_full → web_thumb, some objects only exist
 * as the ~2400px sibling. Public media should fall back instead of 404.
 */

export function publicMediaKeyFallbacks(key: string): string[] {
  const clean = key.replace(/^\/+/, "");
  if (!clean || !clean.includes("/web_thumb/")) return [];
  const full = clean.replace(/\/web_thumb\//g, "/web_full/");
  return full && full !== clean ? [full] : [];
}
