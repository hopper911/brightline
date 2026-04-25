/**
 * Admin session cookie parsing — no `next/headers` so this is safe to import from
 * `proxy.ts` (Next.js proxy) without bundling server-only APIs.
 */
export const ADMIN_ACCESS_COOKIE = "admin_access";
export const ADMIN_ACCESS_VALUE = "true";

function normalizeCookieValue(raw: string): string {
  let v = raw.trim();
  if (v.length >= 2) {
    const q = v[0];
    if ((q === '"' || q === "'") && v.endsWith(q)) {
      v = v.slice(1, -1);
    }
  }
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export function adminCookieIndicatesAccess(value: string | undefined | null): boolean {
  if (value == null) return false;
  return normalizeCookieValue(value) === ADMIN_ACCESS_VALUE;
}

/** Raw cookie value from Cookie header or `cookies().get()` (may be quoted / encoded). */
export function adminAccessCookieValueMatches(raw: string): boolean {
  return normalizeCookieValue(raw) === ADMIN_ACCESS_VALUE;
}

export function parseAdminAccessCookieHeader(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq === -1) continue;
    const name = p.slice(0, eq).trim();
    const value = normalizeCookieValue(p.slice(eq + 1));
    if (name === ADMIN_ACCESS_COOKIE && value === ADMIN_ACCESS_VALUE) return true;
  }
  return false;
}
