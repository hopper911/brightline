import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/platform/audit/record-safely", () => ({
  recordAuditSafely: vi.fn().mockResolvedValue({ ok: true, skipped: true }),
}));

vi.mock("@/lib/platform/jobs/default-job-service", () => ({
  defaultJobService: {
    enqueue: vi.fn(),
    getStatus: vi.fn(),
  },
}));

vi.mock("@/lib/platform/jobs/drain-platform-jobs", () => ({
  awaitPlatformJobs: vi.fn(),
}));

import { awaitPlatformJobs } from "@/lib/platform/jobs/drain-platform-jobs";
import { defaultJobService } from "@/lib/platform/jobs/default-job-service";
import { jobPlatformPatchStudioHubProject } from "@/lib/platform/publishing/integrations/studio-hub-async-publish";

const hubProject = { id: "hub-1", title: "Case Study", slug: "case-study" };

describe("jobPlatformPatchStudioHubProject", () => {
  beforeEach(() => {
    vi.mocked(defaultJobService.enqueue).mockReset();
    vi.mocked(defaultJobService.getStatus).mockReset();
    vi.mocked(awaitPlatformJobs).mockReset();
  });

  it("enqueues hub patch job, drains, and returns hub project", async () => {
    vi.mocked(defaultJobService.enqueue).mockResolvedValue({ jobId: "job-hub-1", status: "PENDING" });
    vi.mocked(awaitPlatformJobs).mockResolvedValue([
      {
        id: "job-hub-1",
        tenantSlug: "mirotech",
        type: "publishing.mirotech.hub.patch",
        status: "COMPLETED",
        payload: { result: { ok: true, hubProject } },
        attempts: 1,
        idempotencyKey: "k1",
        createdAt: "2024-01-01T00:00:00.000Z",
        startedAt: "2024-01-01T00:00:00.000Z",
        completedAt: "2024-01-01T00:00:00.000Z",
        failedAt: null,
        errorSummary: null,
      },
    ]);

    const result = await jobPlatformPatchStudioHubProject("hub-1", { status: "PUBLISHED" });
    expect(defaultJobService.enqueue).toHaveBeenCalled();
    expect(awaitPlatformJobs).toHaveBeenCalledWith(["job-hub-1"], expect.any(Object));
    expect(result.id).toBe("hub-1");
  });
});
