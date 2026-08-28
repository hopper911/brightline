import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { isMirotechRemotePublishConfigured, mirotechSiteOrigin } from "@/lib/platform/publishing/mirotech/remote-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin-only: whether Mirotech journal sync can run from this deployment. */
export async function GET(req: Request) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    configured: isMirotechRemotePublishConfigured(),
    mirotechSiteUrl: mirotechSiteOrigin(),
  });
}
