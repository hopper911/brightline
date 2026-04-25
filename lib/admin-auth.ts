import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import {
  ADMIN_ACCESS_COOKIE,
  adminAccessCookieValueMatches,
  parseAdminAccessCookieHeader,
} from "@/lib/admin-cookie";

/**
 * Read admin cookie from the incoming Request (Route Handlers). Prefer this over
 * `cookies()` from `next/headers` in handlers — matches proxy.ts and avoids cases
 * where the async cookies store does not reflect the request.
 */
export function hasAdminAccessFromRequest(req: Request): boolean {
  try {
    const nx = req as NextRequest;
    if (nx.cookies && typeof nx.cookies.get === "function") {
      const raw = nx.cookies.get(ADMIN_ACCESS_COOKIE)?.value;
      if (raw != null && adminAccessCookieValueMatches(raw)) return true;
    }
  } catch {
    // fall through to header parse
  }
  return parseAdminAccessCookieHeader(req.headers.get("cookie"));
}

/**
 * Route Handlers: prefer reading the incoming Request, then fall back to
 * `cookies()` / `headers()` so auth matches the browser session even when
 * one API is inconsistent on some hosts.
 */
export async function authorizeAdminRequest(req: Request): Promise<boolean> {
  if (hasAdminAccessFromRequest(req)) return true;
  return hasAdminAccess();
}

export async function getAdminSession() {
  const hasAccess = await hasAdminAccess();
  return hasAccess ? { user: { isAdmin: true } } : null;
}

export async function hasAdminAccess() {
  const h = await headers();
  if (parseAdminAccessCookieHeader(h.get("cookie"))) return true;
  const jar = await cookies();
  const jarVal = jar.get(ADMIN_ACCESS_COOKIE)?.value;
  return jarVal != null && adminAccessCookieValueMatches(jarVal);
}

export { adminCookieIndicatesAccess } from "@/lib/admin-cookie";
