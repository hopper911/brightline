import { NextResponse } from "next/server";
import { isPlatformSsoEnabled } from "@/lib/platform/identity/sso/config";
import {
  createPlatformStaffSessionToken,
  PLATFORM_SSO_STATE_COOKIE,
  PLATFORM_STAFF_SESSION_COOKIE,
  PLATFORM_STAFF_SESSION_MAX_AGE_SEC,
  readSsoStateFromRequest,
} from "@/lib/platform/identity/sso/platform-staff-session";
import { currentSiteAudienceFromHost } from "@/lib/platform/identity/sso/redirect-allowlist";
import { ssoExchangeService } from "@/lib/platform/identity/sso/sso-exchange-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cross-domain SSO redeem (Phase 8C).
 * Mounted at /api/platform/sso/redeem on each deploy (brightline + mirotech).
 * Does NOT replace legacy admin login or Mirotech handoff tokens.
 */
export async function GET(req: Request) {
  if (!isPlatformSsoEnabled()) {
    return NextResponse.json({ ok: false, error: "SSO disabled." }, { status: 503 });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const state = url.searchParams.get("state");
  if (!token?.trim() || !state?.trim()) {
    return NextResponse.json({ ok: false, error: "Missing token or state." }, { status: 400 });
  }

  const host = req.headers.get("host");
  const siteAudience = currentSiteAudienceFromHost(host);
  if (!siteAudience) {
    return NextResponse.json({ ok: false, error: "Unknown site audience." }, { status: 400 });
  }

  const expectedState = readSsoStateFromRequest(req);
  const redeemed = await ssoExchangeService.redeemExchange({
    token,
    state,
    expectedState,
    siteAudience,
  });

  if (!redeemed.ok) {
    return NextResponse.json({ ok: false, error: redeemed.reason }, { status: 403 });
  }

  const sessionToken = createPlatformStaffSessionToken(redeemed.userId);
  if (!sessionToken) {
    return NextResponse.json({ ok: false, error: "Staff session unavailable." }, { status: 503 });
  }

  const res = NextResponse.redirect(new URL(redeemed.returnTo, url.origin));
  res.cookies.set(PLATFORM_STAFF_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PLATFORM_STAFF_SESSION_MAX_AGE_SEC,
  });
  res.cookies.set(PLATFORM_SSO_STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
