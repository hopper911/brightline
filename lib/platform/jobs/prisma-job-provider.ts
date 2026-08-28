import type { CreateJobInput, JobProvider, JobUpdatePatch } from "@/lib/platform/jobs/job-provider";
import {
  findPlatformJobById,
  findPlatformJobByIdempotencyKey,
  insertPlatformJob,
  updatePlatformJob,
} from "@/lib/platform/jobs/repository";
import type { JobRecord } from "@/lib/platform/jobs/types";

export class PrismaJobProvider implements JobProvider {
  async create(input: CreateJobInput): Promise<JobRecord> {
    return insertPlatformJob({
      tenantSlug: input.tenantSlug,
      type: input.type,
      status: input.status,
      payload: input.payload,
      attempts: input.attempts,
      idempotencyKey: input.idempotencyKey,
      errorSummary: input.errorSummary,
      startedAt: input.startedAt ? new Date(input.startedAt) : null,
      completedAt: input.completedAt ? new Date(input.completedAt) : null,
      failedAt: input.failedAt ? new Date(input.failedAt) : null,
    });
  }

  async getById(id: string): Promise<JobRecord | null> {
    return findPlatformJobById(id);
  }

  async findByIdempotencyKey(key: string): Promise<JobRecord | null> {
    return findPlatformJobByIdempotencyKey(key);
  }

  async update(id: string, patch: JobUpdatePatch): Promise<JobRecord | null> {
    return updatePlatformJob(id, {
      status: patch.status,
      payload: patch.payload,
      attempts: patch.attempts,
      errorSummary: patch.errorSummary,
      startedAt: patch.startedAt === undefined ? undefined : patch.startedAt ? new Date(patch.startedAt) : null,
      completedAt:
        patch.completedAt === undefined ? undefined : patch.completedAt ? new Date(patch.completedAt) : null,
      failedAt: patch.failedAt === undefined ? undefined : patch.failedAt ? new Date(patch.failedAt) : null,
    });
  }
}

export const prismaJobProvider = new PrismaJobProvider();
