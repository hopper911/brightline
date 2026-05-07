import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { computeStudioPriorities } from "@/lib/studio/priorityEngine";
import { loadStudioProjectsForIntelligence } from "@/lib/studio/intelligence-loader";
import { upsertDailyProjectHealthSnapshots } from "@/lib/studio/persistProjectHealth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Read-only operational intelligence JSON for Studio OS (deterministic scores + Mission Control priorities).
 * Optional: `?persist=1` writes today's ProjectHealthSnapshot rows (UTC day bucket).
 */
export async function GET(req: Request) {
  const ok = await authorizeAdminRequest(req);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(req.url);
  const persist = url.searchParams.get("persist") === "1";

  const [projects, leads, clients, emailThreads] = await Promise.all([
    loadStudioProjectsForIntelligence(100),
    prisma.studioLead.findMany({
      where: { convertedProjectId: null },
      orderBy: [{ followUpDate: "asc" }, { createdAt: "desc" }],
      take: 40,
      select: {
        id: true,
        name: true,
        company: true,
        status: true,
        followUpDate: true,
        createdAt: true,
        convertedProjectId: true,
      },
    }),
    prisma.studioClient.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
      take: 80,
      select: {
        id: true,
        companyName: true,
        followUpStatus: true,
        followUpAt: true,
        _count: { select: { projects: true } },
      },
    }),
    prisma.studioEmailThread.findMany({
      orderBy: { lastMessageAt: "desc" },
      take: 8,
      select: {
        id: true,
        subject: true,
        fromName: true,
        fromEmail: true,
        lastMessageAt: true,
        unread: true,
        matchedClientId: true,
        matchedLeadId: true,
        matchedProjectId: true,
      },
    }),
  ]);

  const engine = computeStudioPriorities({
    projects,
    leads,
    clients: clients.map((c) => ({
      id: c.id,
      companyName: c.companyName,
      followUpStatus: c.followUpStatus,
      followUpAt: c.followUpAt,
      projectsCount: c._count.projects,
    })),
    emailThreads,
  });

  if (persist) {
    await upsertDailyProjectHealthSnapshots(engine.projectHealth);
  }

  return NextResponse.json({
    ok: true,
    todayFocus: engine.todayFocus,
    risks: engine.risks,
    opportunities: engine.opportunities,
    suggestions: engine.suggestions,
    projectHealth: engine.projectHealth,
    persisted: persist,
  });
}
