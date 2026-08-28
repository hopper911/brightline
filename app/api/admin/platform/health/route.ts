import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { CORRELATION_HEADER, correlationIdFromRequest } from "@/lib/observability/correlation";
import { getPlatformHealthSnapshot } from "@/lib/platform/observability/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin health probe — extended flags only; never exposes DSNs or DB URLs. */
export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const health = await getPlatformHealthSnapshot({ extended: true });
  const res = NextResponse.json(health, { status: health.ok ? 200 : 503 });
  res.headers.set(CORRELATION_HEADER, correlationIdFromRequest(req));
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}
