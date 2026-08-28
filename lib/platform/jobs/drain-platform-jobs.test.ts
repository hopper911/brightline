import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/platform/jobs/repository", () => ({
  findPlatformJobById: vi.fn(),
  listRunnablePlatformJobs: vi.fn(),
}));

vi.mock("@/lib/platform/jobs/default-job-service", () => ({
  defaultJobService: {
    runJob: vi.fn(),
    getStatus: vi.fn(),
  },
}));

import { findPlatformJobById, listRunnablePlatformJobs } from "@/lib/platform/jobs/repository";
import { defaultJobService } from "@/lib/platform/jobs/default-job-service";
import { awaitPlatformJobs, drainPlatformJobs } from "@/lib/platform/jobs/drain-platform-jobs";

const pendingJob = {
  id: "job-1",
  tenantSlug: "brightline" as const,
  type: "publishing.mirotech.journal.sync",
  status: "PENDING" as const,
  payload: {},
  attempts: 0,
  idempotencyKey: "k1",
  createdAt: "2024-01-01T00:00:00.000Z",
  startedAt: null,
  completedAt: null,
  failedAt: null,
  errorSummary: null,
};

describe("drainPlatformJobs", () => {
  const savedFlag = process.env.PLATFORM_JOBS_ENABLED;

  beforeEach(() => {
    process.env.PLATFORM_JOBS_ENABLED = "true";
    vi.mocked(listRunnablePlatformJobs).mockReset();
    vi.mocked(findPlatformJobById).mockReset();
    vi.mocked(defaultJobService.runJob).mockReset();
  });

  afterEach(() => {
    if (savedFlag === undefined) delete process.env.PLATFORM_JOBS_ENABLED;
    else process.env.PLATFORM_JOBS_ENABLED = savedFlag;
  });

  it("returns empty result when jobs flag is off", async () => {
    delete process.env.PLATFORM_JOBS_ENABLED;
    const result = await drainPlatformJobs();
    expect(result.processed).toBe(0);
  });

  it("runs runnable jobs from cron queue", async () => {
    vi.mocked(listRunnablePlatformJobs).mockResolvedValue([pendingJob]);
    vi.mocked(defaultJobService.runJob).mockResolvedValue({
      ...pendingJob,
      status: "COMPLETED",
      attempts: 1,
    });

    const result = await drainPlatformJobs({ maxJobs: 5 });
    expect(result.processed).toBe(1);
    expect(result.completed).toBe(1);
    expect(defaultJobService.runJob).toHaveBeenCalled();
  });

  it("awaitPlatformJobs drains specific job ids", async () => {
    vi.mocked(findPlatformJobById)
      .mockResolvedValueOnce(pendingJob)
      .mockResolvedValueOnce({ ...pendingJob, status: "COMPLETED", attempts: 1 });
    vi.mocked(defaultJobService.runJob).mockResolvedValue({
      ...pendingJob,
      status: "COMPLETED",
      attempts: 1,
    });

    const records = await awaitPlatformJobs(["job-1"]);
    expect(records[0]?.status).toBe("COMPLETED");
  });
});
