/**
 * Bright Line Studio OS – weekly summary generator
 *
 * Revenue summary, project performance, top wins, missed opportunities.
 * Sync, no AI. Safe for job execution.
 */

import { getHistoricalContext } from "@/lib/analytics";
import { getOutstandingInvoices } from "@/lib/finance/store";
import { getPipelineStats } from "@/lib/analytics";

export function generateWeeklySummaryContent(): string {
  const ctx = getHistoricalContext();
  const invoices = getOutstandingInvoices();
  const pipeline = getPipelineStats();

  const sections: string[] = [];

  sections.push("## Revenue summary");
  sections.push(`Total revenue: $${ctx.totalRevenue.toLocaleString()}`);
  sections.push(`Projects with payments: ${ctx.revenueByType.reduce((s, r) => s + r.count, 0)}`);
  if (ctx.revenueByType.length > 0) {
    const top = ctx.revenueByType[0];
    if (top) {
      sections.push(`Top category: ${top.type} ($${top.revenue.toLocaleString()}, ${top.count} projects)`);
    }
  }

  sections.push("");
  sections.push("## Project performance");
  sections.push(`Total projects: ${ctx.totalProjects}`);
  sections.push(`Delivered: ${ctx.conversionByType.reduce((s, c) => s + c.delivered, 0)}`);
  sections.push(`Ready for delivery: ${pipeline.readyForDelivery}`);
  const bestConversion = ctx.conversionByType
    .filter((c) => c.total >= 2)
    .sort((a, b) => b.ratePct - a.ratePct)[0];
  if (bestConversion && bestConversion.ratePct > 0) {
    sections.push(`Highest conversion: ${bestConversion.type} (${bestConversion.ratePct}%)`);
  }

  sections.push("");
  sections.push("## Top wins");
  if (ctx.repeatClients.length > 0) {
    const top = ctx.repeatClients.slice(0, 3).map((r) => `${r.client} (${r.count} projects)`).join(", ");
    sections.push(`Repeat clients: ${top}`);
  }
  if (ctx.revenueByType.length > 0) {
    const top = ctx.revenueByType[0];
    if (top) {
      sections.push(`Highest-revenue category: ${top.type} (avg $${top.avgPerProject.toLocaleString()}/project)`);
    }
  }
  if (ctx.repeatClients.length === 0 && ctx.revenueByType.length === 0) {
    sections.push("Add more projects and payments to surface wins.");
  }

  sections.push("");
  sections.push("## Missed opportunities");
  if (invoices.length > 0) {
    sections.push(`${invoices.length} overdue invoice(s) — follow up for payment`);
  }
  if (ctx.marketingUtilization.deliveredTotal > 0 && ctx.marketingUtilization.pct < 50) {
    sections.push(`Only ${ctx.marketingUtilization.pct}% of delivered projects have marketing content — create case studies`);
  }
  if (ctx.newLeadsLast14d === 0 && ctx.totalProjects > 0) {
    sections.push("No new leads in 14 days — consider outreach or content");
  }
  if (pipeline.stuckInEditing >= 2) {
    sections.push(`${pipeline.stuckInEditing} project(s) stuck in editing — clear the backlog`);
  }
  if (
    invoices.length === 0 &&
    ctx.marketingUtilization.pct >= 50 &&
    ctx.newLeadsLast14d > 0 &&
    pipeline.stuckInEditing < 2
  ) {
    sections.push("No major missed opportunities detected.");
  }

  return sections.join("\n");
}
