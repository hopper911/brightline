import { NextResponse } from "next/server";
import { sendDueFollowUps } from "@/lib/followups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  try {
    const result = await sendDueFollowUps();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("FOLLOWUP_CRON_ERROR", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Follow-up cron failed." },
      { status: 500 }
    );
  }
}

