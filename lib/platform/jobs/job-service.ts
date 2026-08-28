import type { PlatformContext } from "@/lib/platform/context/types";
import type { EnqueueJobInput, EnqueueJobResult, JobRecord } from "@/lib/platform/jobs/types";

/**
 * Platform job orchestration boundary (Phase 7A).
 */
export interface JobService {
  enqueue(context: PlatformContext, input: EnqueueJobInput): Promise<EnqueueJobResult>;
  getStatus(context: PlatformContext, jobId: string): Promise<JobRecord | null>;
  /**
   * Execute a pending/failed job — used by tests and future cron drain (Phase 7B).
   * Not exposed on public HTTP routes in 7A.
   */
  runJob(context: PlatformContext, jobId: string): Promise<JobRecord>;
}

/** Alias for cross-module service typing. */
export type PlatformJobService = JobService;
