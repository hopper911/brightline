import type { CreateJobInput, JobProvider, JobUpdatePatch } from "@/lib/platform/jobs/job-provider";
import type { JobRecord } from "@/lib/platform/jobs/types";

/**
 * Process-local job store (Phase 7A).
 * Used in Vitest — not durable across serverless invocations.
 */
export class MemoryJobProvider implements JobProvider {
  private readonly store = new Map<string, JobRecord>();
  private readonly idempotencyIndex = new Map<string, string>();

  async create(input: CreateJobInput): Promise<JobRecord> {
    const id = crypto.randomUUID();
    const record: JobRecord = { id, ...input };
    this.store.set(id, record);
    if (record.idempotencyKey) {
      this.idempotencyIndex.set(record.idempotencyKey, id);
    }
    return { ...record };
  }

  async getById(id: string): Promise<JobRecord | null> {
    const record = this.store.get(id);
    return record ? { ...record } : null;
  }

  async findByIdempotencyKey(key: string): Promise<JobRecord | null> {
    const id = this.idempotencyIndex.get(key);
    if (!id) return null;
    return this.getById(id);
  }

  async update(id: string, patch: JobUpdatePatch): Promise<JobRecord | null> {
    const existing = this.store.get(id);
    if (!existing) return null;
    const next: JobRecord = { ...existing, ...patch };
    this.store.set(id, next);
    if (next.idempotencyKey) {
      this.idempotencyIndex.set(next.idempotencyKey, id);
    }
    return { ...next };
  }

  /** Test helper — clear all jobs. */
  clear(): void {
    this.store.clear();
    this.idempotencyIndex.clear();
  }
}

export const memoryJobProvider = new MemoryJobProvider();
