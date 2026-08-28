import type { JobRecord } from "@/lib/platform/jobs/types";

export type JobUpdatePatch = Partial<
  Pick<
    JobRecord,
    "status" | "attempts" | "startedAt" | "completedAt" | "failedAt" | "errorSummary"
  >
>;

export type CreateJobInput = Omit<JobRecord, "id">;

/**
 * Persistence + execution backend for platform jobs.
 * Phase 7A: in-memory provider; Phase 7B may add Postgres + cron drain.
 */
export interface JobProvider {
  create(input: CreateJobInput): Promise<JobRecord>;
  getById(id: string): Promise<JobRecord | null>;
  update(id: string, patch: JobUpdatePatch): Promise<JobRecord | null>;
}
