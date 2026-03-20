"use server";

import { isVercelVisualOnly } from "@/lib/runtime/vercel";
import type { Job, JobType } from "@/lib/jobs";
import { isDemoMode } from "@/lib/runtime/demo";
import { DEMO_JOBS } from "@/lib/studio/demoData";
import { runWithDemoMode } from "@/lib/runtime/demoContext";
import { assertNotDemoMode } from "@/lib/runtime/demoGuard";

export async function fetchJobs(filters?: { status?: string; limit?: number }): Promise<Job[]> {
  if (isVercelVisualOnly()) return [];
  if (await isDemoMode()) {
    const status = filters?.status;
    const limit = filters?.limit ?? 100;
    const rows = status ? DEMO_JOBS.filter((j) => j.status === status) : DEMO_JOBS;
    return rows.slice(0, limit) as unknown as Job[];
  }
  const { getJobs } = await import("@/lib/jobs");
  return getJobs({
    status: filters?.status as "scheduled" | "running" | "completed" | "failed" | undefined,
    limit: filters?.limit,
  });
}

export async function scheduleJob(jobType: JobType, scheduledFor: string, projectId?: string | null) {
  if (isVercelVisualOnly()) return null;
  const demo = await isDemoMode();
  return runWithDemoMode(demo, async () => {
    assertNotDemoMode("Scheduling jobs");
    const { createJob } = await import("@/lib/jobs");
    return createJob({ jobType, scheduledFor, projectId });
  });
}

export async function runJobsNow() {
  if (isVercelVisualOnly()) return { run: 0, completed: 0, failed: 0 };
  const demo = await isDemoMode();
  return runWithDemoMode(demo, async () => {
    assertNotDemoMode("Running jobs");
    const { runDueJobs } = await import("@/lib/jobs");
    return runDueJobs();
  });
}

const JOB_TYPES: JobType[] = [
  "summarize_recent_activity",
  "remind_pending_approvals",
  "remind_pending_delivery_drafts",
  "refresh_content_queue_summary",
  "refresh_archive_summary",
  "daily_strategy_summary",
  "weekly_strategy_summary",
];

export async function scheduleDefaultJobs() {
  if (isVercelVisualOnly()) return [];
  const demo = await isDemoMode();
  return runWithDemoMode(demo, async () => {
    assertNotDemoMode("Scheduling default jobs");
    const { createJob } = await import("@/lib/jobs");
    const now = new Date().toISOString();
    const jobs = [];
    for (const jobType of JOB_TYPES) {
      jobs.push(createJob({ jobType, scheduledFor: now }));
    }
    return jobs;
  });
}
