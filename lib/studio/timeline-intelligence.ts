import type { ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { STUDIO_PROJECT_PIPELINE } from "@/lib/studio/project-status-display";

const MS_PER_DAY = 86_400_000;

function pipelineIndex(status: ProjectStatus): number {
  return STUDIO_PROJECT_PIPELINE.indexOf(status);
}

export type TimelineIntelRow = {
  studioProjectId: string;
  title: string;
  clientLabel: string;
  /** Rule-based bullet lines for Mission Control (internal). */
  insights: string[];
  /** For sorting: higher = needs attention sooner */
  weight: number;
};

/**
 * Derives lightweight production timeline signals from stage history, tasks, and calendar density.
 * Read-only; safe to call from RSC or API routes.
 */
export async function loadTimelineIntelligenceForProjects(
  projectIds: string[]
): Promise<TimelineIntelRow[]> {
  if (projectIds.length === 0) return [];

  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [projects, stageRows, taskAgg, eventWeekCount] = await Promise.all([
    prisma.studioProject.findMany({
      where: { id: { in: projectIds } },
      select: {
        id: true,
        title: true,
        client: true,
        status: true,
        deliveryDate: true,
        isCancelled: true,
      },
    }),
    prisma.studioProjectStageHistory.findMany({
      where: { studioProjectId: { in: projectIds } },
      orderBy: { changedAt: "desc" },
      select: {
        studioProjectId: true,
        toStatus: true,
        changedAt: true,
      },
    }),
    prisma.studioTask.groupBy({
      by: ["studioProjectId"],
      where: {
        studioProjectId: { in: projectIds },
        parentTaskId: null,
        status: { in: ["TODO", "IN_PROGRESS", "WAITING"] },
      },
      _count: { _all: true },
    }),
    prisma.studioScheduleEvent.count({
      where: { startsAt: { gte: now, lte: weekEnd } },
    }),
  ]);

  const overdueByProject = await prisma.studioTask.groupBy({
    by: ["studioProjectId"],
    where: {
      studioProjectId: { in: projectIds },
      parentTaskId: null,
      status: { in: ["TODO", "IN_PROGRESS", "WAITING"] },
      dueAt: { lt: now },
    },
    _count: { _all: true },
  });

  const openTasks = new Map(taskAgg.map((t) => [t.studioProjectId!, t._count._all]));
  const overdueTasks = new Map(overdueByProject.map((t) => [t.studioProjectId!, t._count._all]));

  const latestStageEnter = new Map<string, Date>();
  for (const row of projects) {
    const firstForCurrent = stageRows.find(
      (h) => h.studioProjectId === row.id && h.toStatus === row.status
    );
    if (firstForCurrent) {
      latestStageEnter.set(row.id, firstForCurrent.changedAt);
    }
  }

  const denseCalendar = eventWeekCount >= 12;

  const rows: TimelineIntelRow[] = [];

  for (const p of projects) {
    if (p.isCancelled) continue;
    const insights: string[] = [];
    let weight = 0;

    const stageSince = latestStageEnter.get(p.id);
    if (stageSince) {
      const days = Math.floor((now.getTime() - stageSince.getTime()) / MS_PER_DAY);
      if (days >= 14) {
        insights.push(`In current production stage for ${days} days — confirm next client touchpoint.`);
        weight += 3 + Math.min(days / 7, 4);
      } else if (days >= 7) {
        insights.push(`About a week in the current stage (${days} days).`);
        weight += 2;
      }
    }

    const idx = pipelineIndex(p.status);
    if (idx >= 0 && idx <= pipelineIndex("EDITING")) {
      const open = openTasks.get(p.id) ?? 0;
      const overdue = overdueTasks.get(p.id) ?? 0;
      if (overdue > 0) {
        insights.push(`${overdue} overdue task${overdue === 1 ? "" : "s"} — reschedule or close.`);
        weight += 5 + overdue;
      } else if (open >= 6) {
        insights.push(`${open} open tasks — consider trimming or sequencing.`);
        weight += 2;
      }
    }

    if (p.deliveryDate) {
      const ms = p.deliveryDate.getTime() - now.getTime();
      const daysTo = Math.ceil(ms / MS_PER_DAY);
      if (daysTo < 0) {
        insights.push(`Delivery date was ${Math.abs(daysTo)} day(s) ago — update schedule or client expectations.`);
        weight += 6;
      } else if (daysTo <= 7 && !["DELIVERED", "PUBLISHED", "ARCHIVED"].includes(p.status)) {
        insights.push(`Delivery target within ${daysTo} day(s) — prioritize finishing lanes.`);
        weight += 4;
      }
    }

    if (denseCalendar && insights.length > 0) {
      insights.push("Calendar is dense this week — protect deep-edit blocks when possible.");
    }

    if (insights.length > 0) {
      rows.push({
        studioProjectId: p.id,
        title: p.title,
        clientLabel: p.client,
        insights,
        weight,
      });
    }
  }

  rows.sort((a, b) => b.weight - a.weight);
  return rows;
}
