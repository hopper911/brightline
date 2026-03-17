/**
 * Bright Line Studio OS – analytics layer
 *
 * Read-only aggregations. No AI. Simple SQL.
 */

import { getDb } from "@/lib/db";
import { listProjects } from "@/lib/projects/store";
import { getEvents } from "@/lib/events/logger";
import { getDrafts } from "@/lib/drafts/store";

export type RevenueSummary = {
  totalRevenue: number;
  projectCount: number;
  byProject: { projectId: string | null; total: number }[];
};

export function getRevenueSummary(): RevenueSummary {
  const db = getDb();
  const totalRow = db.prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM payments").get() as { total: number };
  const projectRows = db
    .prepare(
      "SELECT project_id AS projectId, SUM(amount) AS total FROM payments GROUP BY project_id ORDER BY total DESC"
    )
    .all() as { projectId: string | null; total: number }[];
  const countRow = db.prepare("SELECT COUNT(DISTINCT project_id) AS cnt FROM payments WHERE project_id IS NOT NULL").get() as { cnt: number };
  return {
    totalRevenue: totalRow.total,
    projectCount: countRow.cnt,
    byProject: projectRows,
  };
}

export type ProjectStats = {
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byLocation: Record<string, number>;
  total: number;
};

export function getProjectStats(): ProjectStats {
  const projects = listProjects();
  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byLocation: Record<string, number> = {};
  for (const p of projects) {
    const s = p.status ?? "unknown";
    const t = p.type ?? "unknown";
    const loc = p.location ?? "unknown";
    byStatus[s] = (byStatus[s] ?? 0) + 1;
    byType[t] = (byType[t] ?? 0) + 1;
    byLocation[loc] = (byLocation[loc] ?? 0) + 1;
  }
  return { byStatus, byType, byLocation, total: projects.length };
}

export type PipelineStats = {
  byStatus: Record<string, number>;
  stuckInEditing: number;
  stuckInProduction: number;
  readyForDelivery: number;
};

export function getPipelineStats(): PipelineStats {
  const projects = listProjects();
  const byStatus: Record<string, number> = {};
  let stuckInEditing = 0;
  let stuckInProduction = 0;
  let readyForDelivery = 0;
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  for (const p of projects) {
    const s = p.status ?? "unknown";
    byStatus[s] = (byStatus[s] ?? 0) + 1;
    const updated = new Date(p.updatedAt).getTime();
    const daysSince = (now - updated) / DAY_MS;
    if (s === "editing_in_progress" && daysSince > 7) stuckInEditing++;
    if (s === "planned" && daysSince > 14) stuckInProduction++;
    if (s === "ready_for_delivery") readyForDelivery++;
  }

  return { byStatus, stuckInEditing, stuckInProduction, readyForDelivery };
}

export type RecentEventsSummary = {
  count: number;
  byRoom: Record<string, number>;
  recent: { room: string; summary: string; createdAt: string }[];
};

export function getRecentEventsSummary(limit = 20): RecentEventsSummary {
  const events = getEvents();
  const recent = events.slice(0, limit);
  const byRoom: Record<string, number> = {};
  for (const e of events) {
    byRoom[e.room] = (byRoom[e.room] ?? 0) + 1;
  }
  return {
    count: events.length,
    byRoom,
    recent: recent.map((e) => ({ room: e.room, summary: e.summary, createdAt: e.createdAt })),
  };
}

/** Historical context for Founder Strategy insights. */
export type HistoricalContext = {
  revenueByType: { type: string; revenue: number; count: number; avgPerProject: number }[];
  conversionByType: { type: string; total: number; delivered: number; ratePct: number }[];
  repeatClients: { client: string; count: number }[];
  topLocations: { location: string; count: number }[];
  highValuePatterns: { pattern: string; count: number; avgRevenue: number }[];
  marketingUtilization: { deliveredWithMarketing: number; deliveredTotal: number; pct: number };
  newLeadsLast7d: number;
  newLeadsLast14d: number;
  backlogEditing: number;
  backlogDelivery: number;
  totalProjects: number;
  totalRevenue: number;
};

export function getHistoricalContext(): HistoricalContext {
  const projects = listProjects();
  const revenue = getRevenueSummary();
  const pipeline = getPipelineStats();
  const projectIdToProject = new Map(projects.map((p) => [p.id, p]));

  const revenueByType: Record<string, { revenue: number; count: number }> = {};
  const deliveredByType: Record<string, number> = {};
  const totalByType: Record<string, number> = {};
  const locationCount: Record<string, number> = {};
  const patternCount: Record<string, { count: number; revenue: number }> = {};

  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  let newLeads7d = 0;
  let newLeads14d = 0;
  const deliveredIds = new Set<string>();

  for (const p of projects) {
    const type = p.type ?? "unknown";
    const loc = p.location ?? "unknown";
    if (type !== "unknown") totalByType[type] = (totalByType[type] ?? 0) + 1;
    if (loc !== "unknown") locationCount[loc] = (locationCount[loc] ?? 0) + 1;

    if (p.status === "delivered" || p.status === "complete") {
      deliveredIds.add(p.id);
      if (type !== "unknown") deliveredByType[type] = (deliveredByType[type] ?? 0) + 1;
    }
    if (p.status === "lead") {
      const created = new Date(p.createdAt).getTime();
      const days = (now - created) / DAY_MS;
      if (days <= 7) newLeads7d++;
      if (days <= 14) newLeads14d++;
    }

    const notes = (p.notes ?? "").toLowerCase();
    const patterns = [
      { key: "office", test: /office|corporate|workspace/i },
      { key: "headshot", test: /headshot|executive|portrait/i },
      { key: "marketing", test: /marketing|brand|content/i },
      { key: "event", test: /event|gala|party/i },
    ];
    for (const { key, test } of patterns) {
      if (test.test(notes) || test.test(p.name ?? "")) {
        const rev = revenue.byProject.find((r) => r.projectId === p.id)?.total ?? 0;
        if (!patternCount[key]) patternCount[key] = { count: 0, revenue: 0 };
        patternCount[key].count++;
        patternCount[key].revenue += rev;
      }
    }
  }

  for (const row of revenue.byProject) {
    if (!row.projectId) continue;
    const p = projectIdToProject.get(row.projectId);
    const type = p?.type ?? "unknown";
    if (type === "unknown") continue;
    if (!revenueByType[type]) revenueByType[type] = { revenue: 0, count: 0 };
    revenueByType[type].revenue += row.total;
    revenueByType[type].count++;
  }

  const revenueByTypeArr = Object.entries(revenueByType)
    .map(([type, { revenue: rev, count }]) => ({
      type,
      revenue: rev,
      count,
      avgPerProject: count > 0 ? Math.round(rev / count) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const conversionByType = Object.keys(totalByType).map((type) => {
    const total = totalByType[type] ?? 0;
    const delivered = deliveredByType[type] ?? 0;
    return { type, total, delivered, ratePct: total > 0 ? Math.round((delivered / total) * 100) : 0 };
  });

  const byClient: Record<string, number> = {};
  for (const p of projects) {
    const c = p.client ?? "unknown";
    if (c === "unknown") continue;
    byClient[c] = (byClient[c] ?? 0) + 1;
  }
  const repeatClients = Object.entries(byClient)
    .filter(([, count]) => count >= 2)
    .map(([client, count]) => ({ client, count }))
    .sort((a, b) => b.count - a.count);

  const topLocations = Object.entries(locationCount)
    .filter(([k]) => k !== "unknown")
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const highValuePatterns = Object.entries(patternCount).map(([pattern, { count, revenue }]) => ({
    pattern,
    count,
    avgRevenue: count > 0 ? Math.round(revenue / count) : 0,
  }));

  const deliveredTotal = deliveredIds.size;
  const marketingDrafts = getDrafts("marketing");
  const marketingProjectIds = new Set(
    marketingDrafts.map((d) => d.projectId).filter((id): id is string => !!id)
  );
  const deliveredWithMarketing = [...deliveredIds].filter((id) => marketingProjectIds.has(id)).length;
  const marketingUtilization = {
    deliveredWithMarketing,
    deliveredTotal,
    pct: deliveredTotal > 0 ? Math.round((deliveredWithMarketing / deliveredTotal) * 100) : 0,
  };

  return {
    revenueByType: revenueByTypeArr,
    conversionByType,
    repeatClients,
    topLocations,
    highValuePatterns,
    marketingUtilization,
    newLeadsLast7d: newLeads7d,
    newLeadsLast14d: newLeads14d,
    backlogEditing: pipeline.stuckInEditing,
    backlogDelivery: pipeline.readyForDelivery,
    totalProjects: projects.length,
    totalRevenue: revenue.totalRevenue,
  };
}
