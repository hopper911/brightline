import "server-only";

import { recordAuditSafely } from "@/lib/platform/audit/record-safely";
import type { PlatformContext } from "@/lib/platform/context/types";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import {
  JobForbiddenError,
  JobInvalidStateError,
  JobNotFoundError,
  JobsDisabledError,
  JobUnsupportedError,
} from "@/lib/platform/jobs/errors";
import {
  defaultJobHandlerRegistry,
  type JobHandlerRegistry,
} from "@/lib/platform/jobs/job-handler-registry";
import type { JobProvider } from "@/lib/platform/jobs/job-provider";
import type { JobService } from "@/lib/platform/jobs/job-service";
import { memoryJobProvider } from "@/lib/platform/jobs/memory-job-provider";
import { assertSafeJobPayload } from "@/lib/platform/jobs/payload-security";
import {
  PLATFORM_HEALTH_TEST_JOB,
  assertValidEnqueueInput,
  type EnqueueJobInput,
  type EnqueueJobResult,
  type JobRecord,
} from "@/lib/platform/jobs/types";
import { runPlatformHealthTestJob } from "@/lib/platform/jobs/handlers/platform-health-test";

function nowIso(): string {
  return new Date().toISOString();
}

function registerDefaultHandlers(registry: JobHandlerRegistry): void {
  if (!registry.has(PLATFORM_HEALTH_TEST_JOB)) {
    registry.register(PLATFORM_HEALTH_TEST_JOB, runPlatformHealthTestJob);
  }
}

/**
 * Default JobService — enqueue, status, and in-process execution (Phase 7A).
 *
 * Gated by PLATFORM_JOBS_ENABLED. No production routes call this yet.
 */
export class DefaultJobService implements JobService {
  constructor(
    private readonly provider: JobProvider = memoryJobProvider,
    private readonly registry: JobHandlerRegistry = defaultJobHandlerRegistry
  ) {
    registerDefaultHandlers(this.registry);
  }

  async enqueue(context: PlatformContext, input: EnqueueJobInput): Promise<EnqueueJobResult> {
    this.assertEnabled();
    const valid = assertValidEnqueueInput(input);
    assertSafeJobPayload(valid.payload ?? {});

    const createdAt = nowIso();
    const record = await this.provider.create({
      tenantSlug: context.tenant.slug,
      type: valid.type,
      status: "PENDING",
      payload: valid.payload ?? {},
      attempts: 0,
      createdAt,
      startedAt: null,
      completedAt: null,
      failedAt: null,
      errorSummary: null,
    });

    await recordAuditSafely({
      context,
      actor: { type: "SYSTEM" },
      action: "job.created",
      resource: { type: "job", id: record.id },
      metadata: { jobType: record.type },
    });

    return { jobId: record.id };
  }

  async getStatus(context: PlatformContext, jobId: string): Promise<JobRecord | null> {
    this.assertEnabled();
    const record = await this.provider.getById(jobId);
    if (!record) return null;
    this.assertTenantAccess(context, record);
    return record;
  }

  async runJob(context: PlatformContext, jobId: string): Promise<JobRecord> {
    this.assertEnabled();
    const existing = await this.provider.getById(jobId);
    if (!existing) {
      throw new JobNotFoundError();
    }
    this.assertTenantAccess(context, existing);

    if (existing.status !== "PENDING" && existing.status !== "FAILED") {
      throw new JobInvalidStateError(
        `Job ${jobId} is ${existing.status}; only PENDING or FAILED jobs can run.`
      );
    }

    const handler = this.registry.get(existing.type);
    if (!handler) {
      throw new JobUnsupportedError(`No handler for job type "${existing.type}".`);
    }

    const startedAt = nowIso();
    const running = await this.provider.update(jobId, {
      status: "RUNNING",
      attempts: existing.attempts + 1,
      startedAt,
      errorSummary: null,
      failedAt: null,
      completedAt: null,
    });
    if (!running) {
      throw new JobNotFoundError();
    }

    try {
      await handler(context, running);
      const completed = await this.provider.update(jobId, {
        status: "COMPLETED",
        completedAt: nowIso(),
      });
      if (!completed) {
        throw new JobNotFoundError();
      }

      await recordAuditSafely({
        context,
        actor: { type: "SYSTEM" },
        action: "job.completed",
        resource: { type: "job", id: jobId },
        metadata: { jobType: completed.type, attempts: completed.attempts },
      });

      return completed;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Job execution failed.";
      const failed = await this.provider.update(jobId, {
        status: "FAILED",
        failedAt: nowIso(),
        errorSummary: message.slice(0, 500),
      });

      await recordAuditSafely({
        context,
        actor: { type: "SYSTEM" },
        action: "job.failed",
        resource: { type: "job", id: jobId },
        metadata: {
          jobType: existing.type,
          attempts: failed?.attempts ?? running.attempts,
          error: message.slice(0, 200),
        },
      });

      if (failed) return failed;
      throw err;
    }
  }

  private assertEnabled(): void {
    if (!isPlatformFeatureEnabled("jobs")) {
      throw new JobsDisabledError();
    }
  }

  private assertTenantAccess(context: PlatformContext, record: JobRecord): void {
    if (record.tenantSlug !== context.tenant.slug) {
      throw new JobForbiddenError();
    }
  }
}

export const defaultJobService = new DefaultJobService();
