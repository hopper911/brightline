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

export async function getFounderDailySummary() {
  return runGetDailySummary();
}

export async function getRevenueSnapshot() {
  return runGetRevenueSummary();
}

export async function getOutstandingInvoicesAction() {
  return runGetOutstandingInvoices();
}

export async function getPipelineStatusAction() {
  return runGetPipelineStatus();
}

export async function getPrioritiesAction() {
  return runSuggestPriorities();
}

export async function getMostProfitableCategoriesAction() {
  return runGetMostProfitableCategories();
}

export async function getRepeatClientsAction() {
  return runGetRepeatClients();
}

export async function getLocationsAction() {
  return runCompareLocations();
}

export async function getRecentEventsAction() {
  return getRecentEventsSummary(10);
}

export async function getLatestDailySummary() {
  return getLatestSummary("daily");
}

export async function getLatestWeeklySummary() {
  return getLatestSummary("weekly");
}
