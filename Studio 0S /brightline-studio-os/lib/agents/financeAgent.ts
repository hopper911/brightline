/**
 * Bright Line Studio OS – Finance Agent
 *
 * Revenue summaries, outstanding invoices, project profitability, expense summaries.
 * Read/track only. No bank connection, no auto-send.
 */

import { logEvent } from "@/lib/events/logger";
import { getRevenueSummary, getFinanceAiContext } from "@/lib/analytics";
import { generateFinanceNarrative } from "@/lib/ai";
import {
  getOutstandingInvoicesForWorkspace,
  getExpensesByProjectForWorkspace,
  getPaymentsByProjectForWorkspace,
  listExpensesForWorkspace,
  getExpensesByCategoryForWorkspace,
} from "@/lib/finance/store";

export function runGetRevenueSummary(workspaceId?: string) {
  const summary = getRevenueSummary(workspaceId);
  logEvent({
    room: "strategy",
    agent: "Finance Agent",
    type: "finance_revenue_summary",
    status: "success",
    summary: `Revenue summary: $${summary.totalRevenue.toFixed(0)} across ${summary.projectCount} projects`,
    workspaceId,
  });
  return summary;
}

export function runGetOutstandingInvoices(workspaceId?: string) {
  const invoices = getOutstandingInvoicesForWorkspace(workspaceId);
  logEvent({
    room: "strategy",
    agent: "Finance Agent",
    type: "finance_outstanding_invoices",
    status: "success",
    summary: `Found ${invoices.length} outstanding invoice(s)`,
    workspaceId,
  });
  return invoices;
}

export function runCalculateProjectProfit(workspaceId: string | undefined, projectId: string) {
  const payments = getPaymentsByProjectForWorkspace(workspaceId, projectId);
  const expenses = getExpensesByProjectForWorkspace(workspaceId, projectId);
  const totalRevenue = payments.reduce((s, p) => s + p.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const profit = totalRevenue - totalExpenses;
  return { totalRevenue, totalExpenses, profit };
}

export function runSummarizeExpenses(workspaceId?: string, category?: string) {
  const expenses = category ? getExpensesByCategoryForWorkspace(workspaceId, category) : listExpensesForWorkspace(workspaceId, 100);
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    const c = e.category ?? "uncategorized";
    byCategory[c] = (byCategory[c] ?? 0) + e.amount;
  }
  return { total, count: expenses.length, byCategory };
}

export async function runGenerateFinanceNarrative(workspaceId?: string) {
  const invoices = getOutstandingInvoicesForWorkspace(workspaceId);
  const expenses = listExpensesForWorkspace(workspaceId, 500);
  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    const c = e.category ?? "uncategorized";
    byCategory[c] = (byCategory[c] ?? 0) + e.amount;
  }
  const expensesByCategory = Object.entries(byCategory)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const ctx = getFinanceAiContext({
    outstandingInvoicesCount: invoices.length,
    expensesByCategory,
  });

  const result = await generateFinanceNarrative(ctx);
  logEvent({
    room: "strategy",
    agent: "Finance Agent",
    type: "finance_narrative_generated",
    status: "success",
    summary: `Finance narrative generated using ${result.source === "ollama" ? "Ollama" : "fallback"}`,
    workspaceId,
  });
  return result;
}
