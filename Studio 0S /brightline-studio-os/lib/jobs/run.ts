/**
 * Bright Line Studio OS – job runner
 *
 * Runs due jobs, logs to events, marks complete/failed.
 */

import { getDueJobs, markJobRunningForWorkspace, markJobCompleteForWorkspace, markJobFailedForWorkspace } from "./store";
import { executeJob } from "./executors";
import { logEvent } from "@/lib/events/logger";
import { trackUsage } from "@/lib/usage/track";

export async function runDueJobs(): Promise<{ run: number; completed: number; failed: number }> {
  const now = new Date().toISOString();
  const due = getDueJobs(now);
  let completed = 0;
  let failed = 0;

  for (const job of due) {
    const started = markJobRunningForWorkspace(job.workspaceId, job.id);
    if (!started) continue;

    try {
      trackUsage({
        workspaceId: job.workspaceId,
        eventType: "workflows_triggered",
        quantity: 1,
        meta: { jobType: job.jobType, projectId: job.projectId ?? null },
      });
      const result = await executeJob(job);
      if (result.success) {
        markJobCompleteForWorkspace(job.workspaceId, job.id, result.summary);
        completed++;
        logEvent({
          room: "jobs",
          agent: "jobs",
          type: "job_completed",
          status: "success",
          summary: `${job.jobType}: ${result.summary.slice(0, 120)}${result.summary.length > 120 ? "…" : ""}`,
          projectId: job.projectId,
          workspaceId: job.workspaceId,
        });
      } else {
        markJobFailedForWorkspace(job.workspaceId, job.id, result.summary);
        failed++;
        logEvent({
          room: "jobs",
          agent: "jobs",
          type: "job_failed",
          status: "failed",
          summary: `${job.jobType}: ${result.summary}`,
          projectId: job.projectId,
          workspaceId: job.workspaceId,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      markJobFailedForWorkspace(job.workspaceId, job.id, msg);
      failed++;
      logEvent({
        room: "jobs",
        agent: "jobs",
        type: "job_failed",
        status: "failed",
        summary: `${job.jobType}: ${msg}`,
        projectId: job.projectId,
        workspaceId: job.workspaceId,
      });
    }
  }

  return { run: due.length, completed, failed };
}
