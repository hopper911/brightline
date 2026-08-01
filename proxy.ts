import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adminCookieIndicatesAccess } from "@/lib/admin-cookie";
import { rejectCrossSiteMutation } from "@/lib/admin-request-origin";
import { pathRequiresCsrf } from "@/lib/truth/security";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permanent CSRF baseline (lib/truth/security) — admin / studio / accountant.
  if (pathRequiresCsrf(pathname)) {
    const csrf = rejectCrossSiteMutation(request, {
      requestOrigin: request.nextUrl.origin,
    });
    if (csrf) return csrf;
  }

  // Accountant API: CSRF above; auth is enforced per-route.
  if (pathname.startsWith("/api/accountant")) {
    return NextResponse.next();
  }

  if (
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/api/admin") &&
    !pathname.startsWith("/studio") &&
    !pathname.startsWith("/api/studio")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin/login") || pathname.startsWith("/api/admin/login")) {
    return NextResponse.next();
  }

  // Canva OAuth callback is a top-level GET redirect; auth still required below.
  const adminAccess = adminCookieIndicatesAccess(
    request.cookies.get("admin_access")?.value
  );
  if (adminAccess) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-brightline-admin-pathname", pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (pathname.startsWith("/api/admin") || pathname.startsWith("/api/studio")) {
    return NextResponse.json(
      {
        ok: false,
        error: "Admin session expired. Please log in again at /admin/login.",
        code: "admin_session",
      },
      { status: 401 }
    );
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/studio",
    "/studio/:path*",
    "/api/studio/:path*",
    "/api/accountant/:path*",
  ],
};
