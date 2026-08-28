import { NextResponse } from "next/server";
import { getPlatformHealthSnapshot } from "@/lib/platform/observability/health";
import { correlationIdFromRequest, CORRELATION_HEADER } from "@/lib/observability/correlation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public liveness — no auth, no infrastructure secrets. */
export async function GET(req: Request) {
  const health = await getPlatformHealthSnapshot();
  const res = NextResponse.json(
    {
      ok: health.ok,
      ts: health.ts,
      checks: health.checks,
    },
    { status: health.ok ? 200 : 503 }
  );
  res.headers.set(CORRELATION_HEADER, correlationIdFromRequest(req));
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}
