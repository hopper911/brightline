"use server";

import { isVercelVisualOnly } from "@/lib/runtime/vercel";
import { isDemoMode } from "@/lib/runtime/demo";
import { DEMO_STRATEGY } from "@/lib/studio/demoData";
import { getEntitlements } from "@/lib/billing/entitlements";

export async function getFounderDailySummary() {
  if (isVercelVisualOnly()) {
    return {
      todaySummary: "Vercel visual-only: local intelligence is available in local mode.",
      priorities: [],
      risks: [],
      opportunities: [],
      insights: [],
    };
  }
  if (await isDemoMode()) {
    return {
      todaySummary: DEMO_STRATEGY.todaySummary,
      priorities: DEMO_STRATEGY.priorities,
      risks: DEMO_STRATEGY.risks,
      opportunities: DEMO_STRATEGY.opportunities,
      insights: DEMO_STRATEGY.insights,
    };
  }
  if (!getEntitlements().advancedAgents) {
    return {
      todaySummary: "Upgrade required to access advanced agents in Strategy Room.",
      priorities: [],
      risks: [],
      opportunities: [],
      insights: [],
    };
  }
  const { runGetDailySummary } = await import("@/lib/agents/founderAgent");
  return runGetDailySummary();
}

export async function getRevenueSnapshot() {
  if (isVercelVisualOnly()) {
    return { totalRevenue: 0, projectCount: 0, byProject: [] };
  }
  if (await isDemoMode()) {
    return {
      totalRevenue: DEMO_STRATEGY.revenue.totalRevenue,
      projectCount: DEMO_STRATEGY.revenue.projectCount,
      byProject: DEMO_STRATEGY.revenue.byProject.map((p) => ({ projectId: p.projectId, total: p.revenue })),
    };
  }
  if (!getEntitlements().analytics) {
    return { totalRevenue: 0, projectCount: 0, byProject: [] };
  }
  const { runGetRevenueSummary } = await import("@/lib/agents/financeAgent");
  return runGetRevenueSummary();
}

export async function getOutstandingInvoicesAction() {
  if (isVercelVisualOnly()) return [];
  if (await isDemoMode()) return [];
  const { runGetOutstandingInvoices } = await import("@/lib/agents/financeAgent");
  return runGetOutstandingInvoices();
}

export async function getPipelineStatusAction() {
  if (isVercelVisualOnly()) {
    return { byStatus: {}, readyForDelivery: 0, bottlenecks: [] };
  }
  if (await isDemoMode()) {
    return DEMO_STRATEGY.pipeline;
  }
  if (!getEntitlements().advancedAgents) {
    return { byStatus: {}, readyForDelivery: 0, bottlenecks: ["Upgrade required to run advanced operations agent."] };
  }
  const { runGetPipelineStatus } = await import("@/lib/agents/operationsAgent");
  return runGetPipelineStatus();
}

export async function getPrioritiesAction() {
  if (isVercelVisualOnly()) return [];
  if (await isDemoMode()) return DEMO_STRATEGY.priorities;
  if (!getEntitlements().advancedAgents) return [];
  const { runSuggestPriorities } = await import("@/lib/agents/operationsAgent");
  return runSuggestPriorities();
}

export async function getMostProfitableCategoriesAction() {
  if (isVercelVisualOnly()) return [];
  if (await isDemoMode()) return [];
  if (!getEntitlements().advancedAgents) return [];
  const { runGetMostProfitableCategories } = await import("@/lib/agents/biAgent");
  return runGetMostProfitableCategories();
}

export async function getRepeatClientsAction() {
  if (isVercelVisualOnly()) return [];
  if (await isDemoMode()) return [];
  if (!getEntitlements().advancedAgents) return [];
  const { runGetRepeatClients } = await import("@/lib/agents/biAgent");
  return runGetRepeatClients();
}

export async function getLocationsAction() {
  if (isVercelVisualOnly()) return [];
  if (await isDemoMode()) return [];
  if (!getEntitlements().advancedAgents) return [];
  const { runCompareLocations } = await import("@/lib/agents/biAgent");
  return runCompareLocations();
}

export async function getRecentEventsAction() {
  if (isVercelVisualOnly()) return { count: 0, byRoom: {}, recent: [] };
  if (await isDemoMode()) {
    return {
      count: 7,
      byRoom: { reception: 1, production: 1, editing: 1, delivery: 1, marketing: 1, automation: 1, strategy: 1 },
      recent: [],
    };
  }
  if (!getEntitlements().analytics) {
    return { count: 0, byRoom: {}, recent: [] };
  }
  const { getRecentEventsSummary } = await import("@/lib/analytics");
  return getRecentEventsSummary(undefined, 10);
}

export async function getLatestDailySummary() {
  if (isVercelVisualOnly()) return null;
  if (await isDemoMode()) return null;
  const { getLatestSummary } = await import("@/lib/summaries/store");
  return getLatestSummary("daily");
}

export async function getLatestWeeklySummary() {
  if (isVercelVisualOnly()) return null;
  if (await isDemoMode()) return null;
  const { getLatestSummary } = await import("@/lib/summaries/store");
  return getLatestSummary("weekly");
}
