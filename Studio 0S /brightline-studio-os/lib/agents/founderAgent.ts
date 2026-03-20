/**
 * Bright Line Studio OS – Founder Strategy Agent
 *
 * CEO assistant. Historical analysis, smart insights, priorities, risks, opportunities.
 * Feels like a real business advisor.
 */

import { logEvent } from "@/lib/events/logger";
import { getRecentEventsSummary, getHistoricalContext } from "@/lib/analytics";
import { getPendingApprovals } from "@/lib/approvals/store";
import { getDrafts } from "@/lib/drafts/store";
import { generateStrategyInsights } from "@/lib/ai";
import { runGetOutstandingInvoices } from "./financeAgent";
import { runGetOverdueTasks, runSuggestPriorities, runGetPipelineStatus } from "./operationsAgent";
import { runGetRepeatClients, runGetMostProfitableCategories } from "./biAgent";

const DAY_MS = 24 * 60 * 60 * 1000;

export type FounderSummary = {
  todaySummary: string;
  priorities: string[];
  risks: string[];
  opportunities: string[];
  insights: string[];
};

export async function runGetDailySummary(): Promise<FounderSummary> {
  const events = getRecentEventsSummary(undefined, 10);
  const approvals = getPendingApprovals();
  const drafts = getDrafts();
  const ctx = getHistoricalContext();

  const todaySummary = [
    `${events.count} total events`,
    `${approvals.length} pending approval(s)`,
    `${drafts.length} draft(s)`,
    ctx.newLeadsLast7d > 0 ? `${ctx.newLeadsLast7d} new lead(s) this week` : null,
  ]
    .filter(Boolean)
    .join(". ");

  // Priority engine: pending approvals, overdue responses, ready delivery, stuck backlog
  const priorities: string[] = [];
  const overdueApprovals = approvals.filter((a) => {
    const created = new Date(a.createdAt).getTime();
    return Date.now() - created > DAY_MS;
  });
  if (overdueApprovals.length > 0) {
    priorities.push(`${overdueApprovals.length} approval(s) pending >24h — respond soon`);
  }
  priorities.push(...runSuggestPriorities());
  if (priorities.length === 0) priorities.push("No urgent items");

  // Risk detection
  const risks: string[] = [];
  const invoices = runGetOutstandingInvoices();
  const overdueTasks = runGetOverdueTasks();
  if (invoices.length > 0) risks.push(`${invoices.length} overdue invoice(s) — follow up for payment`);
  risks.push(...overdueTasks);
  if (ctx.newLeadsLast14d === 0 && ctx.totalProjects > 0) {
    risks.push("No new leads in 14 days — consider outreach or content");
  }
  if (ctx.backlogEditing >= 3) {
    risks.push(`Heavy editing backlog (${ctx.backlogEditing} stuck) — consider capacity`);
  }
  if (risks.length === 0) risks.push("No critical risks");

  // Opportunity engine
  const opportunities: string[] = [];
  const repeatClients = runGetRepeatClients();
  const profitable = runGetMostProfitableCategories();
  if (repeatClients.length > 0) {
    const top = repeatClients.slice(0, 2).map((r) => r.client).join(", ");
    opportunities.push(`Reach out to repeat clients: ${top}`);
  }
  const deliveredNoMarketing =
    ctx.marketingUtilization.deliveredTotal > 0
      ? ctx.marketingUtilization.deliveredTotal - ctx.marketingUtilization.deliveredWithMarketing
      : 0;
  if (deliveredNoMarketing >= 2) {
    opportunities.push(`${deliveredNoMarketing} delivered project(s) without marketing content — create case studies or social`);
  }
  if (profitable.length > 0) {
    const top = profitable[0];
    if (top && top.avgPerProject > 0) {
      opportunities.push(`Target ${top.type.replace(/_/g, " ")} — your highest-revenue category ($${top.avgPerProject.toLocaleString()} avg)`);
    }
  }
  const bestConversion = ctx.conversionByType
    .filter((c) => c.total >= 3 && c.ratePct > 0)
    .sort((a, b) => b.ratePct - a.ratePct)[0];
  if (bestConversion) {
    opportunities.push(`${bestConversion.type.replace(/_/g, " ")} has ${bestConversion.ratePct}% conversion — double down on this niche`);
  }
  if (opportunities.length === 0) {
    opportunities.push("Add more projects and payments to surface opportunities");
  }

  // AI-generated insights from historical data
  const { insights } = await generateStrategyInsights(ctx);

  logEvent({
    room: "strategy",
    agent: "Founder Strategy Agent",
    type: "founder_strategy_summary",
    status: "success",
    summary: `Strategy: ${priorities.length} priorities, ${risks.length} risks, ${opportunities.length} opportunities, ${insights.length} insights`,
  });

  return {
    todaySummary,
    priorities,
    risks,
    opportunities,
    insights,
  };
}
