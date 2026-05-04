import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { getDashboardMetrics } from "@/lib/dashboard-metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const metrics = await getDashboardMetrics();
    return NextResponse.json({
      revenue: metrics.revenue,
      clients: metrics.clients,
      projects: metrics.projects,
      delivery: metrics.delivery,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load metrics.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
