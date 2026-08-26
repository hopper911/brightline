import { NextResponse } from "next/server";
import { guardAdminJson } from "@/lib/api/guards";
import { jsonErr } from "@/lib/api/http";
import { clearTokens, isCanvaConfigured, isCanvaConnected } from "@/lib/canva/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Disconnect Canva (clear stored tokens). */
export async function DELETE(req: Request) {
  const denied = await guardAdminJson(req);
  if (denied) return denied;

  await clearTokens();
  return NextResponse.json({
    ok: true,
    configured: isCanvaConfigured(),
    connected: false,
  });
}

export async function GET(req: Request) {
  const denied = await guardAdminJson(req);
  if (denied) return denied;

  return NextResponse.json({
    ok: true,
    configured: isCanvaConfigured(),
    connected: await isCanvaConnected(),
  });
}
