/**
 * T9 / Image Port store siblings under portfolio/ or mirotech/:
 *   {root}/{pillar}/web_full/*  — ~2400px (use for heroes, galleries, case studies)
 *   {root}/{pillar}/web_thumb/* — ~800px (previews / cards only)
 *
 * Prefer full when attaching or displaying so CMS never stretches thumbs full-bleed.
 */
export function preferPortfolioWebFullKey(keyOrUrl: string): string {
  const raw = keyOrUrl.trim();
  if (!raw) return raw;

  // Absolute / relative URLs that embed the R2 key in ?key=
  if (/^https?:\/\//i.test(raw) || raw.startsWith("/")) {
    try {
      const base = raw.startsWith("/") ? "https://local.invalid" : undefined;
      const u = new URL(raw, base);
      const key = u.searchParams.get("key");
      if (key && key.includes("/web_thumb/")) {
        u.searchParams.set("key", key.replace(/\/web_thumb\//g, "/web_full/"));
        if (raw.startsWith("/")) {
          return `${u.pathname}${u.search}${u.hash}`;
        }
        return u.toString();
      }
    } catch {
      /* fall through */
    }
    return raw.replace(/\/web_thumb\//g, "/web_full/");
  }

  return raw.replace(/^\/+/, "").replace(/\/web_thumb\//g, "/web_full/");
}
