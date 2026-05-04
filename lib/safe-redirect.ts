/**
 * Client-only: post-login redirect must stay same-origin and avoid open redirects.
 */
export function safeClientRedirectPath(raw: string | null, fallback: string): string {
  const fb = fallback.startsWith("/") ? fallback : `/${fallback}`;
  if (raw == null || !raw.trim()) return fb;
  const s = raw.trim();
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  if (typeof window === "undefined") return fb;
  try {
    if (s.startsWith("http://") || s.startsWith("https://")) {
      const u = new URL(s);
      if (u.origin === window.location.origin) {
        const path = `${u.pathname}${u.search}${u.hash}`;
        return path.startsWith("/") ? path : fb;
      }
      return fb;
    }
  } catch {
    return fb;
  }
  return fb;
}
