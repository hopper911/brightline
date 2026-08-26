import { NextResponse } from "next/server";

/**
 * Reject cross-site state-changing API calls (defense beyond SameSite=Lax).
 * Allows same-origin browser fetches and missing Origin when Sec-Fetch-Site is
 * `same-origin`, `same-site`, or `none`.
 */
export function rejectCrossSiteMutation(
  req: Request,
  options?: { requestOrigin?: string }
): NextResponse | null {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return null;

  const fetchSite = (req.headers.get("sec-fetch-site") || "").toLowerCase();
  if (fetchSite === "cross-site") {
    return NextResponse.json({ ok: false, error: "Forbidden origin." }, { status: 403 });
  }

  const origin = req.headers.get("origin");
  if (!origin) return null;

  try {
    const reqOrigin =
      options?.requestOrigin || new URL(req.url).origin;
    if (origin !== reqOrigin) {
      return NextResponse.json({ ok: false, error: "Forbidden origin." }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Forbidden origin." }, { status: 403 });
  }
  return null;
}

/** @deprecated Prefer rejectCrossSiteMutation — kept for existing imports. */
export function assertSameOriginAdminMutation(req: Request): NextResponse | null {
  return rejectCrossSiteMutation(req);
}
