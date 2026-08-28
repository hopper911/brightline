import "server-only";

import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import type { DefaultJobService } from "@/lib/platform/jobs/default-job-service";
import { defaultJobService } from "@/lib/platform/jobs/default-job-service";
import { findPlatformJobById, listRunnablePlatformJobs } from "@/lib/platform/jobs/repository";
import type { JobRecord, JobStatus } from "@/lib/platform/jobs/types";

export type DrainPlatformJobsResult = {
  processed: number;
  completed: number;
  failed: number;
  skipped: number;
  jobIds: string[];
};

const TERMINAL_STATUSES: JobStatus[] = ["COMPLETED", "FAILED"];

function isRunnable(status: JobStatus): boolean {
  return status === "PENDING" || status === "FAILED";
}

/**
 * Run platform jobs to completion — shared by request adapters and cron drain (Phase 7C).
 */
export async function drainPlatformJobs(options?: {
  jobIds?: string[];
  maxJobs?: number;
  jobService?: DefaultJobService;
}): Promise<DrainPlatformJobsResult> {
  if (!isPlatformFeatureEnabled("jobs")) {
    return { processed: 0, completed: 0, failed: 0, skipped: 0, jobIds: [] };
  }

  const service = options?.jobService ?? defaultJobService;
  const maxJobs = options?.maxJobs ?? 10;
  const result: DrainPlatformJobsResult = {
    processed: 0,
    completed: 0,
    failed: 0,
    skipped: 0,
    jobIds: [],
  };

  let candidates: JobRecord[] = [];
  if (options?.jobIds?.length) {
    for (const id of options.jobIds) {
      const job = await findPlatformJobById(id);
      if (job) candidates.push(job);
    }
  } else {
    candidates = await listRunnablePlatformJobs(maxJobs);
  }

  for (const job of candidates.slice(0, maxJobs)) {
    result.jobIds.push(job.id);

    if (TERMINAL_STATUSES.includes(job.status)) {
      result.skipped += 1;
      if (job.status === "COMPLETED") result.completed += 1;
      if (job.status === "FAILED") result.failed += 1;
      continue;
    }

    if (!isRunnable(job.status)) {
      result.skipped += 1;
      continue;
    }

    result.processed += 1;
    const context = createPlatformContextForTenant(job.tenantSlug);
    try {
      const final = await service.runJob(context, job.id);
      if (final.status === "COMPLETED") result.completed += 1;
      else if (final.status === "FAILED") result.failed += 1;
    } catch {
      result.failed += 1;
    }
  }

  return result;
}

/**
 * Enqueue-then-drain helper for admin routes that must return synchronous outcomes.
 */
export async function awaitPlatformJobs(
  jobIds: string[],
  options?: { jobService?: DefaultJobService }
): Promise<JobRecord[]> {
  if (!jobIds.length) return [];
  await drainPlatformJobs({ jobIds, maxJobs: jobIds.length, jobService: options?.jobService });
  const records: JobRecord[] = [];
  for (const jobId of jobIds) {
    const job = await findPlatformJobById(jobId);
    if (job) records.push(job);
  }
  return records;
}
