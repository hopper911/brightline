/**
 * Prefer Secure cookies on HTTPS deployments (production + Vercel preview),
 * not merely when NODE_ENV === "production" (mis-set local prod builds).
 */
export function shouldUseSecureCookies(req?: Request): boolean {
  if (process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview") {
    return true;
  }
  if (process.env.NODE_ENV === "production") return true;
  if (req) {
    const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    if (proto === "https") return true;
    try {
      if (new URL(req.url).protocol === "https:") return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}
