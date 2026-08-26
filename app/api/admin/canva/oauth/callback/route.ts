import { NextResponse } from "next/server";
import { hasAdminAccessFromRequest } from "@/lib/admin-auth";
import {
  consumePendingAuth,
  exchangeAuthorizationCode,
  getCanvaRedirectUri,
  isCanvaConfigured,
  saveTokens,
} from "@/lib/canva/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Canva OAuth redirect. Requires an active admin session (proxy + explicit check).
 * Completes PKCE exchange and redirects back to Blog admin.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const blogUrl = `${origin}/admin/blog`;
  const loginUrl = `${origin}/admin/login?next=${encodeURIComponent("/admin/blog")}`;

  if (!hasAdminAccessFromRequest(req)) {
    return NextResponse.redirect(loginUrl);
  }

  const errorParam = url.searchParams.get("error");
  if (errorParam) {
    const desc = url.searchParams.get("error_description") || errorParam;
    return NextResponse.redirect(
      `${blogUrl}?canva=error&message=${encodeURIComponent(desc)}`
    );
  }

  if (!isCanvaConfigured()) {
    return NextResponse.redirect(
      `${blogUrl}?canva=error&message=${encodeURIComponent("Canva is not configured.")}`
    );
  }

  const code = url.searchParams.get("code")?.trim() || "";
  const state = url.searchParams.get("state")?.trim() || "";
  if (!code || !state) {
    return NextResponse.redirect(
      `${blogUrl}?canva=error&message=${encodeURIComponent("Missing OAuth code or state.")}`
    );
  }

  const pending = await consumePendingAuth(state);
  if (!pending) {
    return NextResponse.redirect(
      `${blogUrl}?canva=error&message=${encodeURIComponent("OAuth state expired. Try Connect again.")}`
    );
  }

  try {
    const redirectUri = getCanvaRedirectUri(origin);
    const tokens = await exchangeAuthorizationCode({
      code,
      codeVerifier: pending.codeVerifier,
      redirectUri,
    });
    await saveTokens(tokens);
    return NextResponse.redirect(`${blogUrl}?canva=connected`);
  } catch (err) {
    console.error("CANVA_OAUTH_CALLBACK_ERROR", err);
    const message = err instanceof Error ? err.message : "Canva authorization failed.";
    return NextResponse.redirect(
      `${blogUrl}?canva=error&message=${encodeURIComponent(message)}`
    );
  }
}
