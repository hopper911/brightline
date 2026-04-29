import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { syncStudioEmailInbox } from "@/lib/studio/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let limit: number | undefined;
  try {
    const body = (await req.json().catch(() => ({}))) as { limit?: unknown };
    if (typeof body.limit === "number" && Number.isFinite(body.limit)) {
      limit = Math.max(1, Math.min(Math.trunc(body.limit), 100));
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const result = await syncStudioEmailInbox({ limit });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email sync failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
