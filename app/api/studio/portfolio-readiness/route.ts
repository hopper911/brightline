import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { evaluatePortfolioReadiness } from "@/lib/platform/portfolio/portfolio-readiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const report = await evaluatePortfolioReadiness();
  return NextResponse.json({ ok: true, report });
}
