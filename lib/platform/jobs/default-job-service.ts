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
  JobHandlerRegistry,
  defaultJobHandlerRegistry,
} from "@/lib/platform/jobs/job-handler-registry";
import type { JobProvider } from "@/lib/platform/jobs/job-provider";
import type { JobService } from "@/lib/platform/jobs/job-service";
import { MemoryJobProvider } from "@/lib/platform/jobs/memory-job-provider";
import { MAX_PUBLISHING_JOB_ATTEMPTS } from "@/lib/platform/jobs/publishing-payload";
import { registerDefaultJobHandlers } from "@/lib/platform/jobs/register-default-handlers";
import { resolveDefaultJobProvider } from "@/lib/platform/jobs/resolve-job-provider";
import { assertSafeJobPayload } from "@/lib/platform/jobs/payload-security";
import {
  PUBLISHING_MIROTECH_HUB_PATCH_JOB,
  PUBLISHING_MIROTECH_JOURNAL_SYNC_JOB,
  assertValidEnqueueInput,
  type EnqueueJobInput,
  type EnqueueJobResult,
  type JobRecord,
} from "@/lib/platform/jobs/types";

function nowIso(): string {
  return new Date().toISOString();
}

function maxAttemptsForJobType(type: string): number {
  if (type === PUBLISHING_MIROTECH_JOURNAL_SYNC_JOB) {
    return MAX_PUBLISHING_JOB_ATTEMPTS;
  }
  if (type === PUBLISHING_MIROTECH_HUB_PATCH_JOB) {
    return MAX_PUBLISHING_JOB_ATTEMPTS;
  }
  return 3;
}

/**
 * Default JobService — enqueue, status, and worker execution (Phase 7A/7B).
 *
 * Gated by PLATFORM_JOBS_ENABLED. Production consumers opt in via integration modules.
 */
export class DefaultJobService implements JobService {
  private readonly provider: JobProvider;

  constructor(
    provider: JobProvider = resolveDefaultJobProvider(),
    private readonly registry: JobHandlerRegistry = defaultJobHandlerRegistry
  ) {
    this.provider = provider;
    registerDefaultJobHandlers(this.registry, this.provider);
  }

  async enqueue(context: PlatformContext, input: EnqueueJobInput): Promise<EnqueueJobResult> {
    this.assertEnabled();
    const valid = assertValidEnqueueInput(input);
    assertSafeJobPayload(valid.payload ?? {});

    const idempotencyKey = input.idempotencyKey?.trim() || null;
    if (idempotencyKey && this.provider.findByIdempotencyKey) {
      const existing = await this.provider.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        this.assertTenantAccess(context, existing);
        if (existing.status === "FAILED") {
          return { jobId: existing.id, reused: true, status: existing.status };
        }
        if (
          existing.status === "PENDING" ||
          existing.status === "RUNNING" ||
          existing.status === "COMPLETED"
        ) {
          return { jobId: existing.id, reused: true, status: existing.status };
        }
      }
    }

    const createdAt = nowIso();
    const record = await this.provider.create({
      tenantSlug: context.tenant.slug,
      type: valid.type,
      status: "PENDING",
      payload: valid.payload ?? {},
      attempts: 0,
      idempotencyKey,
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
      metadata: { jobType: record.type, idempotencyKey },
    });

    return { jobId: record.id, status: "PENDING" };
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

    const maxAttempts = maxAttemptsForJobType(existing.type);
    if (existing.attempts >= maxAttempts) {
      throw new JobInvalidStateError(
        `Job ${jobId} exceeded maximum attempts (${maxAttempts}).`
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

/** @internal Vitest helper — isolated in-memory job service. */
export function createMemoryJobService(): DefaultJobService {
  return new DefaultJobService(new MemoryJobProvider(), new JobHandlerRegistry());
}
