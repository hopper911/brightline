import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearerMatchesAutomationSecret(req: Request): boolean {
  const token = req.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  if (!token) return false;
  const expected = process.env.AUTOMATION_API_SECRET || process.env.BL_INTERNAL_API_TOKEN;
  return Boolean(expected && token === expected);
}

type SnapshotInput = {
  dateBucket: string; // ISO date
  pagePath: string;
  pageType: string;
  projectId?: string | null;
  workId?: string | null;
  views?: number;
  users?: number;
  avgEngagementSeconds?: number | null;
  sourceMedium?: string | null;
  conversions?: number;
  notes?: string | null;
};

/** Ingests AnalyticsSnapshot rows. TODO: n8n / scheduled job POSTing rollups (Plausible, GA, Search Console). */
export async function POST(req: Request) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin && !bearerMatchesAutomationSecret(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: { snapshots?: SnapshotInput[] } | SnapshotInput[] | null = null;
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const snapshots = Array.isArray(body)
    ? body
    : body && Array.isArray((body as any).snapshots)
      ? ((body as any).snapshots as SnapshotInput[])
      : [];

  if (!snapshots.length) {
    return NextResponse.json(
      { ok: false, error: "snapshots[] required." },
      { status: 400 }
    );
  }

  const rows = snapshots
    .map((s) => {
      const dateBucket = new Date(String(s.dateBucket));
      if (Number.isNaN(dateBucket.getTime())) return null;
      const pagePath = String(s.pagePath ?? "").trim();
      const pageType = String(s.pageType ?? "").trim();
      if (!pagePath || !pageType) return null;
      const views = typeof s.views === "number" && Number.isFinite(s.views) ? Math.max(0, Math.trunc(s.views)) : 0;
      const users = typeof s.users === "number" && Number.isFinite(s.users) ? Math.max(0, Math.trunc(s.users)) : 0;
      const conversions =
        typeof s.conversions === "number" && Number.isFinite(s.conversions)
          ? Math.max(0, Math.trunc(s.conversions))
          : 0;
      const avgEngagementSeconds =
        s.avgEngagementSeconds === null
          ? null
          : typeof s.avgEngagementSeconds === "number" && Number.isFinite(s.avgEngagementSeconds)
            ? s.avgEngagementSeconds
            : null;
      return {
        dateBucket,
        pagePath,
        pageType,
        projectId: s.projectId ? String(s.projectId).trim() : null,
        workId: s.workId ? String(s.workId).trim() : null,
        views,
        users,
        conversions,
        avgEngagementSeconds,
        sourceMedium: s.sourceMedium ? String(s.sourceMedium).trim() : null,
        notes: s.notes ? String(s.notes).trim() : null,
      };
    })
    .filter(Boolean) as Parameters<typeof prisma.analyticsSnapshot.createMany>[0]["data"];

  if (rows.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No valid snapshot rows." },
      { status: 400 }
    );
  }

  // No unique constraint today; ingest is append-only.
  const result = await prisma.analyticsSnapshot.createMany({
    data: rows,
  });

  return NextResponse.json({ ok: true, inserted: result.count });
}

