import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adminCookieIndicatesAccess } from "@/lib/admin-cookie";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/api/admin") &&
    !pathname.startsWith("/studio")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin/login") || pathname.startsWith("/api/admin/login")) {
    return NextResponse.next();
  }

  const adminAccess = adminCookieIndicatesAccess(
    request.cookies.get("admin_access")?.value
  );
  if (adminAccess) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-brightline-admin-pathname", pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/studio", "/studio/:path*"],
};
