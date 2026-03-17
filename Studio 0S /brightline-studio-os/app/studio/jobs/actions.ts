"use server";

import {
  getJobs,
  createJob,
  runDueJobs,
  type Job,
  type JobType,
} from "@/lib/jobs";
import { isVercelVisualOnly } from "@/lib/runtime/vercel";

export async function fetchJobs(filters?: { status?: string; limit?: number }): Promise<Job[]> {
  if (isVercelVisualOnly()) return [];
  return getJobs({
    status: filters?.status as "scheduled" | "running" | "completed" | "failed" | undefined,
    limit: filters?.limit,
  });
}

export async function scheduleJob(jobType: JobType, scheduledFor: string, projectId?: string | null) {
  if (isVercelVisualOnly()) return null;
  return createJob({ jobType, scheduledFor, projectId });
}

export async function runJobsNow() {
  if (isVercelVisualOnly()) return { run: 0, completed: 0, failed: 0 };
  return runDueJobs();
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
  const now = new Date().toISOString();
  const jobs = [];
  for (const jobType of JOB_TYPES) {
    jobs.push(createJob({ jobType, scheduledFor: now }));
  }
  return jobs;
}
