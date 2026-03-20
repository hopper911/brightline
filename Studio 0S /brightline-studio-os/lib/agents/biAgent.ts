/**
 * Bright Line Studio OS – Business Intelligence Agent
 *
 * Project type analysis, profitability by category, repeat clients, location comparison.
 * Read-only analytics.
 */

import { logEvent } from "@/lib/events/logger";
import { getRevenueSummary, getProjectStats, getBiAiContext } from "@/lib/analytics";
import { listProjectsForWorkspace } from "@/lib/projects/store";
import { generateBiNarrative } from "@/lib/ai";

export function runAnalyzeProjectTypes(workspaceId?: string) {
  const stats = getProjectStats(workspaceId);
  const revenue = getRevenueSummary(workspaceId);
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
    workspaceId,
  });
  return rows;
}

export function runGetMostProfitableCategories(workspaceId?: string) {
  const projects = listProjectsForWorkspace(workspaceId);
  const revenue = getRevenueSummary(workspaceId);
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

export function runGetRepeatClients(workspaceId?: string) {
  const projects = listProjectsForWorkspace(workspaceId);
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
    workspaceId,
  });
  return repeat;
}

export function runCompareLocations(workspaceId?: string) {
  const stats = getProjectStats(workspaceId);
  const rows: { location: string; count: number }[] = [];
  for (const [loc, count] of Object.entries(stats.byLocation)) {
    if (loc === "unknown") continue;
    rows.push({ location: loc, count });
  }
  rows.sort((a, b) => b.count - a.count);
  return rows.slice(0, 10);
}

export async function runGenerateBiNarrative(workspaceId?: string) {
  const ctx = getBiAiContext();
  const result = await generateBiNarrative(ctx);
  logEvent({
    room: "strategy",
    agent: "BI Agent",
    type: "bi_narrative_generated",
    status: "success",
    summary: `BI narrative generated using ${result.source === "ollama" ? "Ollama" : "fallback"}`,
    workspaceId,
  });
  return result;
}
