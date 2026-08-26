import { NextResponse } from "next/server";
import { guardAdminJson } from "@/lib/api/guards";
import { jsonErr } from "@/lib/api/http";
import {
  buildAuthorizeUrl,
  createPkcePair,
  getCanvaRedirectUri,
  isCanvaConfigured,
  isCanvaConnected,
  savePendingAuth,
} from "@/lib/canva/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Start Canva OAuth (PKCE). Returns authorize URL for the admin browser. */
export async function GET(req: Request) {
  const denied = await guardAdminJson(req);
  if (denied) return denied;

  if (!isCanvaConfigured()) {
    return jsonErr(
      "Canva is not configured. Add CANVA_CLIENT_ID and CANVA_CLIENT_SECRET.",
      503
    );
  }

  const origin = new URL(req.url).origin;
  const redirectUri = getCanvaRedirectUri(origin);
  const { codeVerifier, codeChallenge, state } = createPkcePair();
  await savePendingAuth({ state, codeVerifier, createdAt: Date.now() });

  const authorizeUrl = buildAuthorizeUrl({
    codeChallenge,
    state,
    redirectUri,
  });

  return NextResponse.json({
    ok: true,
    authorizeUrl,
    connected: await isCanvaConnected(),
    configured: true,
  });
}

/** Connection status. */
export async function POST(req: Request) {
  const denied = await guardAdminJson(req);
  if (denied) return denied;

  return NextResponse.json({
    ok: true,
    configured: isCanvaConfigured(),
    connected: await isCanvaConnected(),
  });
}
