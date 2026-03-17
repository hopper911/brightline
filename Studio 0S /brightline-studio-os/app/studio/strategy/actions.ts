"use server";

import { runGetDailySummary } from "@/lib/agents/founderAgent";
import { getLatestSummary } from "@/lib/summaries/store";
import { runGetRevenueSummary, runGetOutstandingInvoices } from "@/lib/agents/financeAgent";
import { runGetPipelineStatus, runSuggestPriorities } from "@/lib/agents/operationsAgent";
import {
  runGetMostProfitableCategories,
  runGetRepeatClients,
  runCompareLocations,
} from "@/lib/agents/biAgent";
import { getRecentEventsSummary } from "@/lib/analytics";
import { isVercelVisualOnly } from "@/lib/runtime/vercel";

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
  return runGetDailySummary();
}

export async function getRevenueSnapshot() {
  if (isVercelVisualOnly()) {
    return { totalRevenue: 0, projectCount: 0, byProject: [] };
  }
  return runGetRevenueSummary();
}

export async function getOutstandingInvoicesAction() {
  if (isVercelVisualOnly()) return [];
  return runGetOutstandingInvoices();
}

export async function getPipelineStatusAction() {
  if (isVercelVisualOnly()) {
    return { byStatus: {}, readyForDelivery: 0, bottlenecks: [] };
  }
  return runGetPipelineStatus();
}

export async function getPrioritiesAction() {
  if (isVercelVisualOnly()) return [];
  return runSuggestPriorities();
}

export async function getMostProfitableCategoriesAction() {
  if (isVercelVisualOnly()) return [];
  return runGetMostProfitableCategories();
}

export async function getRepeatClientsAction() {
  if (isVercelVisualOnly()) return [];
  return runGetRepeatClients();
}

export async function getLocationsAction() {
  if (isVercelVisualOnly()) return [];
  return runCompareLocations();
}

export async function getRecentEventsAction() {
  if (isVercelVisualOnly()) return { count: 0, byRoom: {}, recent: [] };
  return getRecentEventsSummary(10);
}

export async function getLatestDailySummary() {
  if (isVercelVisualOnly()) return null;
  return getLatestSummary("daily");
}

export async function getLatestWeeklySummary() {
  if (isVercelVisualOnly()) return null;
  return getLatestSummary("weekly");
}
