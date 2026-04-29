import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { sendStudioEmailDraft } from "@/lib/studio/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: { draftId?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const draftId = typeof body.draftId === "string" ? body.draftId.trim() : "";
  if (!draftId) {
    return NextResponse.json({ ok: false, error: "draftId is required." }, { status: 400 });
  }

  try {
    const result = await sendStudioEmailDraft(draftId);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not send email.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
