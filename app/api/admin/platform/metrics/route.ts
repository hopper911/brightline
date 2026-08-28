import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { CORRELATION_HEADER, correlationIdFromRequest } from "@/lib/observability/correlation";
import { getPlatformMetricsSnapshot } from "@/lib/platform/observability/metrics-snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Operational metrics for admin / Studio System (last 24h + in-process asset counters). */
export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = await getPlatformMetricsSnapshot();
  const res = NextResponse.json({ ok: true, snapshot });
  res.headers.set(CORRELATION_HEADER, correlationIdFromRequest(req));
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}
