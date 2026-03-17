/**
 * Bright Line Studio OS – safe job executors
 *
 * Read-only or summary-only. No file changes, no email, no external systems.
 */

import { getEventsForWorkspace, logEvent } from "@/lib/events/logger";
import { getPendingApprovalsForWorkspace } from "@/lib/approvals/store";
import { getDraftsForWorkspace } from "@/lib/drafts/store";
import { listProjectsForWorkspace } from "@/lib/projects/store";
import { searchArchive } from "@/lib/archive/store";
import { runGetDailySummary } from "@/lib/agents/founderAgent";
import { createSummaryForWorkspace } from "@/lib/summaries/store";
import { generateWeeklySummaryContent } from "@/lib/summaries/weeklyGenerator";
import type { Job } from "./store";

export type JobResult = { summary: string; success: boolean };

/** Summarize recent activity from events. */
export function executeSummarizeRecentActivity(job: Job): JobResult {
  const events = getEventsForWorkspace(job.workspaceId);
  const recent = events.slice(0, 10);
  if (recent.length === 0) {
    return { summary: "No recent activity.", success: true };
  }
  const lines = recent.map((e) => `- ${e.room}: ${e.summary}`).join("\n");
  return {
    summary: `Recent activity (${recent.length} events):\n${lines}`,
    success: true,
  };
}

/** Remind about pending approvals. */
export function executeRemindPendingApprovals(job: Job): JobResult {
  const approvals = getPendingApprovalsForWorkspace(job.workspaceId);
  if (approvals.length === 0) {
    return { summary: "No pending approvals.", success: true };
  }
  const lines = approvals.map((a) => `- [${a.room}] ${a.actionType}`).join("\n");
  return {
    summary: `${approvals.length} pending approval(s):\n${lines}`,
    success: true,
  };
}

/** Remind about pending delivery drafts (projects ready_for_delivery with drafts). */
export function executeRemindPendingDeliveryDrafts(job: Job): JobResult {
  const projects = listProjectsForWorkspace(job.workspaceId);
  const deliveryProjects = projects.filter((p) => p.status === "ready_for_delivery");
  const drafts = getDraftsForWorkspace(job.workspaceId, "delivery");
  const draftProjectIds = new Set(drafts.map((d) => d.projectId).filter(Boolean));
  const pending = deliveryProjects.filter((p) => !draftProjectIds.has(p.id));
  if (pending.length === 0 && deliveryProjects.length > 0) {
    return { summary: "All delivery-ready projects have drafts.", success: true };
  }
  if (deliveryProjects.length === 0) {
    return { summary: "No projects ready for delivery.", success: true };
  }
  const lines = pending.map((p) => `- ${p.name}`).join("\n");
  return {
    summary: `${pending.length} delivery-ready project(s) without drafts:\n${lines}`,
    success: true,
  };
}

/** Refresh content queue summary (marketing drafts count). */
export function executeRefreshContentQueueSummary(job: Job): JobResult {
  const drafts = getDraftsForWorkspace(job.workspaceId, "marketing");
  const events = getEventsForWorkspace(job.workspaceId);
  const contentEvents = events.filter((e) => e.type?.includes("content") || e.room === "marketing").slice(0, 20);
  const count = drafts.length;
  const hint = contentEvents.length > 0 ? `${contentEvents.length} related events in last 20` : "No content events";
  return {
    summary: `Content queue: ${count} marketing draft(s). ${hint}`,
    success: true,
  };
}

/** Refresh archive summary (project counts by status). */
export function executeRefreshArchiveSummary(job: Job): JobResult {
  const projects = searchArchive({ workspaceId: job.workspaceId, limit: 200 });
  const byYear = new Map<string, number>();
  for (const p of projects) {
    const y = p.year ?? "unknown";
    byYear.set(y, (byYear.get(y) ?? 0) + 1);
  }
  const years = Array.from(byYear.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 5)
    .map(([y, n]) => `${y}: ${n}`)
    .join(", ");
  return {
    summary: `Archive: ${projects.length} projects. By year: ${years || "none"}`,
    success: true,
  };
}

/** Daily strategy summary: runs founder agent, stores result, logs event. */
export async function executeDailyStrategySummary(job: Job): Promise<JobResult> {
  try {
    const data = await runGetDailySummary();
    const content = JSON.stringify(data);
    createSummaryForWorkspace(job.workspaceId, "daily", content);
    logEvent({
      room: "strategy",
      agent: "Founder Strategy Agent",
      type: "daily_strategy_summary_generated",
      status: "success",
      summary: "Daily strategy summary generated",
      workspaceId: job.workspaceId,
    });
    return {
      summary: `Daily summary stored: ${data.priorities.length} priorities, ${data.risks.length} risks, ${data.opportunities.length} opportunities`,
      success: true,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { summary: `Daily summary failed: ${msg}`, success: false };
  }
}

/** Weekly strategy summary: revenue, performance, wins, missed opportunities. */
export function executeWeeklyStrategySummary(job: Job): JobResult {
  try {
    const content = generateWeeklySummaryContent();
    createSummaryForWorkspace(job.workspaceId, "weekly", content);
    logEvent({
      room: "strategy",
      agent: "Founder Strategy Agent",
      type: "weekly_strategy_summary_generated",
      status: "success",
      summary: "Weekly strategy summary generated",
      workspaceId: job.workspaceId,
    });
    return {
      summary: "Weekly summary stored: revenue, performance, top wins, missed opportunities",
      success: true,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { summary: `Weekly summary failed: ${msg}`, success: false };
  }
}

const SYNC_EXECUTORS: Record<string, (j: Job) => JobResult> = {
  summarize_recent_activity: executeSummarizeRecentActivity,
  remind_pending_approvals: executeRemindPendingApprovals,
  remind_pending_delivery_drafts: executeRemindPendingDeliveryDrafts,
  refresh_content_queue_summary: executeRefreshContentQueueSummary,
  refresh_archive_summary: executeRefreshArchiveSummary,
  weekly_strategy_summary: executeWeeklyStrategySummary,
};

const ASYNC_EXECUTORS: Record<string, (j: Job) => Promise<JobResult>> = {
  daily_strategy_summary: executeDailyStrategySummary,
};

export async function executeJob(job: Job): Promise<JobResult> {
  const asyncFn = ASYNC_EXECUTORS[job.jobType];
  if (asyncFn) return asyncFn(job);
  const syncFn = SYNC_EXECUTORS[job.jobType];
  if (syncFn) return syncFn(job);
  return { summary: `Unknown job type: ${job.jobType}`, success: false };
}
