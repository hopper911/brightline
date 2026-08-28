import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/platform/audit/record-safely", () => ({
  recordAuditSafely: vi.fn().mockResolvedValue({ ok: true, skipped: true }),
}));

import { recordAuditSafely } from "@/lib/platform/audit/record-safely";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import { createMemoryJobService } from "@/lib/platform/jobs/default-job-service";
import {
  JobForbiddenError,
  JobInvalidStateError,
  JobsDisabledError,
  JobPayloadError,
} from "@/lib/platform/jobs/errors";
import { PLATFORM_HEALTH_TEST_JOB } from "@/lib/platform/jobs/types";

const ENV_KEY = "PLATFORM_JOBS_ENABLED";

describe("DefaultJobService", () => {
  let previousEnv: string | undefined;

  beforeEach(() => {
    previousEnv = process.env[ENV_KEY];
    process.env[ENV_KEY] = "true";
    vi.mocked(recordAuditSafely).mockClear();
  });

  afterEach(() => {
    if (previousEnv === undefined) {
      delete process.env[ENV_KEY];
    } else {
      process.env[ENV_KEY] = previousEnv;
    }
  });

  it("throws when platform jobs flag is off", async () => {
    process.env[ENV_KEY] = "false";
    const service = createMemoryJobService();

    await expect(
      service.enqueue(createPlatformContextForTenant("brightline"), {
        type: PLATFORM_HEALTH_TEST_JOB,
      })
    ).rejects.toBeInstanceOf(JobsDisabledError);
  });

  it("enqueues, runs test job, and records audit events", async () => {
    const service = createMemoryJobService();
    const context = createPlatformContextForTenant("brightline");

    const { jobId } = await service.enqueue(context, { type: PLATFORM_HEALTH_TEST_JOB });
    const pending = await service.getStatus(context, jobId);
    expect(pending?.status).toBe("PENDING");

    const completed = await service.runJob(context, jobId);
    expect(completed.status).toBe("COMPLETED");
    expect(completed.attempts).toBe(1);

    const actions = vi.mocked(recordAuditSafely).mock.calls.map((c) => c[0].action);
    expect(actions).toContain("job.created");
    expect(actions).toContain("job.completed");
  });

  it("rejects cross-tenant status reads", async () => {
    const service = createMemoryJobService();
    const brightline = createPlatformContextForTenant("brightline");
    const mirotech = createPlatformContextForTenant("mirotech");

    const { jobId } = await service.enqueue(brightline, { type: PLATFORM_HEALTH_TEST_JOB });

    await expect(service.getStatus(mirotech, jobId)).rejects.toBeInstanceOf(JobForbiddenError);
  });

  it("rejects unsafe payloads at enqueue", async () => {
    const service = createMemoryJobService();
    const context = createPlatformContextForTenant("brightline");

    await expect(
      service.enqueue(context, {
        type: PLATFORM_HEALTH_TEST_JOB,
        payload: { password: "secret" },
      })
    ).rejects.toBeInstanceOf(JobPayloadError);
  });

  it("cannot run a completed job twice", async () => {
    const service = createMemoryJobService();
    const context = createPlatformContextForTenant("brightline");

    const { jobId } = await service.enqueue(context, { type: PLATFORM_HEALTH_TEST_JOB });
    await service.runJob(context, jobId);

    await expect(service.runJob(context, jobId)).rejects.toBeInstanceOf(JobInvalidStateError);
  });

  it("reuses completed idempotent jobs without creating duplicates", async () => {
    const service = createMemoryJobService();
    const context = createPlatformContextForTenant("brightline");

    const first = await service.enqueue(context, {
      type: PLATFORM_HEALTH_TEST_JOB,
      idempotencyKey: "health-idem-1",
    });
    await service.runJob(context, first.jobId);

    const second = await service.enqueue(context, {
      type: PLATFORM_HEALTH_TEST_JOB,
      idempotencyKey: "health-idem-1",
    });

    expect(second.reused).toBe(true);
    expect(second.jobId).toBe(first.jobId);
  });
});
