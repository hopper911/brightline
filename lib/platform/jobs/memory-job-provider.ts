import type { CreateJobInput, JobProvider, JobUpdatePatch } from "@/lib/platform/jobs/job-provider";
import type { JobRecord } from "@/lib/platform/jobs/types";

/**
 * Process-local job store (Phase 7A).
 * Not durable across serverless invocations — sufficient for contract + tests.
 * Replace with PostgresJobProvider in Phase 7B.
 */
export class MemoryJobProvider implements JobProvider {
  private readonly store = new Map<string, JobRecord>();

  async create(input: CreateJobInput): Promise<JobRecord> {
    const id = crypto.randomUUID();
    const record: JobRecord = { id, ...input };
    this.store.set(id, record);
    return { ...record };
  }

  async getById(id: string): Promise<JobRecord | null> {
    const record = this.store.get(id);
    return record ? { ...record } : null;
  }

  async update(id: string, patch: JobUpdatePatch): Promise<JobRecord | null> {
    const existing = this.store.get(id);
    if (!existing) return null;
    const next: JobRecord = { ...existing, ...patch };
    this.store.set(id, next);
    return { ...next };
  }

  /** Test helper — clear all jobs. */
  clear(): void {
    this.store.clear();
  }
}

export const memoryJobProvider = new MemoryJobProvider();
