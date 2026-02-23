import { NextResponse } from "next/server";
import { hasAdminAccess } from "@/lib/admin-auth";

export async function GET() {
  const ok = await hasAdminAccess();
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const hasR2 =
    Boolean(process.env.R2_BUCKET) &&
    Boolean(process.env.R2_ACCESS_KEY_ID) &&
    Boolean(process.env.R2_SECRET_ACCESS_KEY);
  return NextResponse.json({ ok: true, configured: hasR2 });
}
