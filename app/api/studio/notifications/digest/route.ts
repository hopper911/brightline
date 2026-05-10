import { NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/lib/admin-auth";
import { runStudioNotificationDigest } from "@/lib/studio/notification-digest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const summary = await runStudioNotificationDigest();
  return NextResponse.json({ ok: true, summary });
}
