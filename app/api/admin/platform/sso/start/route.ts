import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { isPlatformSsoEnabled } from "@/lib/platform/identity/sso/config";
import {
  createSsoStateToken,
  PLATFORM_SSO_STATE_COOKIE,
  PLATFORM_STAFF_SESSION_MAX_AGE_SEC,
  readPlatformStaffUserIdFromRequest,
} from "@/lib/platform/identity/sso/platform-staff-session";
import { sanitizeSsoReturnPath } from "@/lib/platform/identity/sso/redirect-allowlist";
import { ssoExchangeService } from "@/lib/platform/identity/sso/sso-exchange-service";
import type { SsoAudience } from "@/lib/platform/identity/sso/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseTarget(raw: string | null): SsoAudience | null {
  const v = raw?.trim().toLowerCase();
  if (v === "mirotech" || v === "brightline") return v;
  return null;
}

/**
 * Opt-in SSO start (Phase 8C) — legacy admin cookie required; does NOT replace login.
 * Requires platform_staff_session (prior SSO) or returns legacy handoff fallback hint.
 */
export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!isPlatformSsoEnabled()) {
    return NextResponse.json({
      ok: true,
      ssoEnabled: false,
      legacyFallback: true,
      message: "SSO unavailable — use legacy admin login and Mirotech handoff.",
    });
  }

  const url = new URL(req.url);
  const audience = parseTarget(url.searchParams.get("target"));
  const returnTo = sanitizeSsoReturnPath(url.searchParams.get("returnTo"), audience ?? "mirotech");

  if (!audience || audience === "brightline") {
    return NextResponse.json({ ok: false, error: "Invalid SSO target." }, { status: 400 });
  }

  const userId = readPlatformStaffUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({
      ok: false,
      ssoEnabled: true,
      legacyFallback: true,
      error: "No PlatformUser staff session — complete SSO from identity authority or use legacy handoff.",
      legacyHandoffPath: `/api/admin/mirotech/handoff?next=${encodeURIComponent(returnTo)}`,
    }, { status: 409 });
  }

  const state = createSsoStateToken();
  const started = await ssoExchangeService.startExchange({
    issuer: "brightline",
    audience,
    userId,
    returnTo,
    state,
  });

  if (!started.ok) {
    return NextResponse.json({ ok: false, error: started.reason }, { status: 503 });
  }

  const res = NextResponse.redirect(started.redirectUrl);
  res.cookies.set(PLATFORM_SSO_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 300,
  });
  return res;
}
