/**
 * Bright Line Studio OS – Operations Agent
 *
 * Overdue tasks, pipeline status, bottlenecks, priorities.
 * Read-only. Uses projects, approvals, events.
 */

import { logEvent } from "@/lib/events/logger";
import { getPipelineStats, getOpsAiContext } from "@/lib/analytics";
import { getPendingApprovalsForWorkspace } from "@/lib/approvals/store";
import { generateOpsNarrative } from "@/lib/ai";

export function runGetOverdueTasks(workspaceId?: string) {
  const pipeline = getPipelineStats(workspaceId);
  const approvals = getPendingApprovalsForWorkspace(workspaceId);
  const tasks: string[] = [];
  if (pipeline.stuckInEditing > 0) {
    tasks.push(`${pipeline.stuckInEditing} project(s) stuck in editing (>7 days)`);
  }
  if (pipeline.stuckInProduction > 0) {
    tasks.push(`${pipeline.stuckInProduction} project(s) stuck in production (>14 days)`);
  }
  if (approvals.length > 0) {
    tasks.push(`${approvals.length} pending approval(s)`);
  }
  logEvent({
    room: "strategy",
    agent: "Operations Agent",
    type: "ops_overdue_check",
    status: "success",
    summary: `Found ${tasks.length} overdue/blocked item(s)`,
    workspaceId,
  });
  return tasks;
}

export function runGetPipelineStatus(workspaceId?: string) {
  const pipeline = getPipelineStats(workspaceId);
  const bottlenecks: string[] = [];
  if (pipeline.stuckInEditing > 0) {
    bottlenecks.push(`${pipeline.stuckInEditing} project(s) stuck in editing`);
  }
  if (pipeline.stuckInProduction > 0) {
    bottlenecks.push(`${pipeline.stuckInProduction} project(s) stuck in production`);
  }
  logEvent({
    room: "strategy",
    agent: "Operations Agent",
    type: "ops_pipeline_check",
    status: "success",
    summary: `Pipeline: ${pipeline.readyForDelivery} ready for delivery. ${bottlenecks.length > 0 ? bottlenecks.join("; ") : "No bottlenecks"}`,
    workspaceId,
  });
  return {
    byStatus: pipeline.byStatus,
    readyForDelivery: pipeline.readyForDelivery,
    bottlenecks,
  };
}

export function runSuggestPriorities(workspaceId?: string) {
  const approvals = getPendingApprovalsForWorkspace(workspaceId);
  const pipeline = getPipelineStats(workspaceId);
  const priorities: string[] = [];
  if (approvals.length > 0) {
    priorities.push(`Review ${approvals.length} pending approval(s)`);
  }
  if (pipeline.readyForDelivery > 0) {
    priorities.push(`${pipeline.readyForDelivery} project(s) ready for delivery`);
  }
  if (pipeline.stuckInEditing > 0) {
    priorities.push(`Clear editing backlog (${pipeline.stuckInEditing} stuck)`);
  }
  if (priorities.length === 0) {
    priorities.push("No urgent items");
  }
  logEvent({
    room: "strategy",
    agent: "Operations Agent",
    type: "ops_priorities_generated",
    status: "success",
    summary: `Generated ${priorities.length} priority item(s)`,
    workspaceId,
  });
  return priorities;
}

export async function runGenerateOpsNarrative(workspaceId?: string) {
  const approvals = getPendingApprovalsForWorkspace(workspaceId);
  const ctx = getOpsAiContext({ pendingApprovals: approvals.length });
  const result = await generateOpsNarrative(ctx);
  logEvent({
    room: "strategy",
    agent: "Operations Agent",
    type: "ops_narrative_generated",
    status: "success",
    summary: `Operations narrative generated using ${result.source === "ollama" ? "Ollama" : "fallback"}`,
    workspaceId,
  });
  return result;
}
