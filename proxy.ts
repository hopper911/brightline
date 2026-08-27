import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adminCookieIndicatesAccess } from "@/lib/admin-cookie";
import { rejectCrossSiteMutation } from "@/lib/admin-request-origin";
import { buildContentSecurityPolicy, createCspNonce } from "@/lib/csp";
import { pathRequiresCsrf } from "@/lib/truth/security";

function withCsp(
  request: NextRequest,
  response: NextResponse,
  nonce: string,
  csp: string
): NextResponse {
  response.headers.set("Content-Security-Policy", csp);
  // Also mirror on request for Next.js nonce extraction during render.
  void request;
  void nonce;
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = createCspNonce();
  const csp = buildContentSecurityPolicy(nonce, "brightline");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next.js reads CSP from the *request* to stamp framework scripts with the nonce.
  requestHeaders.set("Content-Security-Policy", csp);

  // Permanent CSRF baseline (lib/truth/security) — admin / studio / accountant / ai.
  if (pathRequiresCsrf(pathname)) {
    const csrf = rejectCrossSiteMutation(request, {
      requestOrigin: request.nextUrl.origin,
    });
    if (csrf) {
      csrf.headers.set("Content-Security-Policy", csp);
      return csrf;
    }
  }

  // Accountant + AI APIs: CSRF above; auth is enforced per-route.
  if (pathname.startsWith("/api/accountant") || pathname.startsWith("/api/ai")) {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    return withCsp(request, res, nonce, csp);
  }

  const isOperatorPath =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/api/studio");

  if (!isOperatorPath) {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    return withCsp(request, res, nonce, csp);
  }

  if (pathname.startsWith("/admin/login") || pathname.startsWith("/api/admin/login")) {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    return withCsp(request, res, nonce, csp);
  }

  const adminAccess = adminCookieIndicatesAccess(
    request.cookies.get("admin_access")?.value
  );
  if (adminAccess) {
    requestHeaders.set("x-brightline-admin-pathname", pathname);
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    return withCsp(request, res, nonce, csp);
  }

  if (pathname.startsWith("/api/admin") || pathname.startsWith("/api/studio")) {
    const res = NextResponse.json(
      {
        ok: false,
        error: "Admin session expired. Please log in again at /admin/login.",
        code: "admin_session",
      },
      { status: 401 }
    );
    return withCsp(request, res, nonce, csp);
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  loginUrl.searchParams.set("next", pathname);
  const res = NextResponse.redirect(loginUrl);
  return withCsp(request, res, nonce, csp);
}

export const config = {
  matcher: [
    /*
     * Apply CSP nonce to page + API routes; skip Next internals and static assets.
     */
    {
      source: "/((?!_next/static|_next/image|favicon.ico|favicon.png|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
    },
  ],
};
