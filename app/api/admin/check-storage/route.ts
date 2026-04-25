import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";

/** Lightweight health check for R2 env presence (admin only). */
export async function GET(req: Request) {
  const ok = await authorizeAdminRequest(req);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const hasR2 = Boolean(
    process.env.R2_BUCKET && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY
  );
  return NextResponse.json({
    ok: true,
    r2Configured: hasR2,
    publicUrlSet: Boolean(process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL),
  });
}
