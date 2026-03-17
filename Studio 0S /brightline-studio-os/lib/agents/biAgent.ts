/**
 * Bright Line Studio OS – Business Intelligence Agent
 *
 * Project type analysis, profitability by category, repeat clients, location comparison.
 * Read-only analytics.
 */

import { logEvent } from "@/lib/events/logger";
import { getRevenueSummary, getProjectStats } from "@/lib/analytics";
import { listProjects } from "@/lib/projects/store";

export function runAnalyzeProjectTypes() {
  const stats = getProjectStats();
  const revenue = getRevenueSummary();
  const rows: { type: string; count: number; revenueShare?: string }[] = [];
  const totalProjects = stats.total;
  for (const [type, count] of Object.entries(stats.byType)) {
    if (type === "unknown") continue;
    const pct = totalProjects > 0 ? ((count / totalProjects) * 100).toFixed(0) : "0";
    rows.push({ type, count, revenueShare: `${pct}% of projects` });
  }
  logEvent({
    room: "strategy",
    agent: "BI Agent",
    type: "bi_analysis_run",
    status: "success",
    summary: `Analyzed ${rows.length} project types`,
  });
  return rows;
}

export function runGetMostProfitableCategories() {
  const projects = listProjects();
  const revenue = getRevenueSummary();
  const projectIdToType = new Map(projects.map((p) => [p.id, p.type ?? "unknown"]));
  const revenueByType: Record<string, number> = {};
  const countByType: Record<string, number> = {};
  for (const row of revenue.byProject) {
    if (!row.projectId) continue;
    const type = projectIdToType.get(row.projectId) ?? "unknown";
    if (type === "unknown") continue;
    revenueByType[type] = (revenueByType[type] ?? 0) + row.total;
    countByType[type] = (countByType[type] ?? 0) + 1;
  }
  const byType = Object.entries(revenueByType).map(([type, rev]) => ({
    type,
    count: countByType[type] ?? 0,
    totalRevenue: rev,
    avgPerProject: (countByType[type] ?? 0) > 0 ? Math.round(rev / (countByType[type] ?? 1)) : 0,
  }));
  byType.sort((a, b) => b.totalRevenue - a.totalRevenue);
  return byType.slice(0, 10).map(({ type, count, avgPerProject }) => ({ type, count, avgPerProject }));
}

export function runGetRepeatClients() {
  const projects = listProjects();
  const byClient: Record<string, number> = {};
  for (const p of projects) {
    const c = p.client ?? "unknown";
    if (c === "unknown") continue;
    byClient[c] = (byClient[c] ?? 0) + 1;
  }
  const repeat = Object.entries(byClient)
    .filter(([, count]) => count >= 2)
    .map(([client, count]) => ({ client, count }))
    .sort((a, b) => b.count - a.count);
  logEvent({
    room: "strategy",
    agent: "BI Agent",
    type: "bi_repeat_clients",
    status: "success",
    summary: `Found ${repeat.length} repeat client(s)`,
  });
  return repeat;
}

export function runCompareLocations() {
  const stats = getProjectStats();
  const rows: { location: string; count: number }[] = [];
  for (const [loc, count] of Object.entries(stats.byLocation)) {
    if (loc === "unknown") continue;
    rows.push({ location: loc, count });
  }
  rows.sort((a, b) => b.count - a.count);
  return rows.slice(0, 10);
}
