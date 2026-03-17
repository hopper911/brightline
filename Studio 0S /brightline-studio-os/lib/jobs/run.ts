/**
 * Bright Line Studio OS – job runner
 *
 * Runs due jobs, logs to events, marks complete/failed.
 */

import { getDueJobs, markJobRunning, markJobComplete, markJobFailed } from "./store";
import { executeJob } from "./executors";
import { logEvent } from "@/lib/events/logger";

export async function runDueJobs(): Promise<{ run: number; completed: number; failed: number }> {
  const now = new Date().toISOString();
  const due = getDueJobs(now);
  let completed = 0;
  let failed = 0;

  for (const job of due) {
    const started = markJobRunning(job.id);
    if (!started) continue;

    try {
      const result = await executeJob(job);
      if (result.success) {
        markJobComplete(job.id, result.summary);
        completed++;
        logEvent({
          room: "jobs",
          agent: "jobs",
          type: "job_completed",
          status: "success",
          summary: `${job.jobType}: ${result.summary.slice(0, 120)}${result.summary.length > 120 ? "…" : ""}`,
          projectId: job.projectId,
        });
      } else {
        markJobFailed(job.id, result.summary);
        failed++;
        logEvent({
          room: "jobs",
          agent: "jobs",
          type: "job_failed",
          status: "failed",
          summary: `${job.jobType}: ${result.summary}`,
          projectId: job.projectId,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      markJobFailed(job.id, msg);
      failed++;
      logEvent({
        room: "jobs",
        agent: "jobs",
        type: "job_failed",
        status: "failed",
        summary: `${job.jobType}: ${msg}`,
        projectId: job.projectId,
      });
    }
  }

  return { run: due.length, completed, failed };
}
