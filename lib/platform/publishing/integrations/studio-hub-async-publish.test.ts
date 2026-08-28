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

vi.mock("@/lib/platform/jobs/publishing-enqueue", () => ({
  enqueueMirotechHubPatchJob: vi.fn(),
}));

import { defaultJobService } from "@/lib/platform/jobs/default-job-service";
import { enqueueMirotechHubPatchJob } from "@/lib/platform/jobs/publishing-enqueue";
import {
  enqueueStudioHubBlogPatchJob,
  enqueueStudioHubProjectPatchJob,
} from "@/lib/platform/publishing/integrations/studio-hub-async-publish";

const hubProject = { id: "hub-1", title: "Case Study", slug: "case-study" };

describe("enqueueStudioHubProjectPatchJob", () => {
  beforeEach(() => {
    vi.mocked(enqueueMirotechHubPatchJob).mockReset();
    vi.mocked(defaultJobService.getStatus).mockReset();
  });

  it("returns accepted jobId without inline drain", async () => {
    vi.mocked(enqueueMirotechHubPatchJob).mockResolvedValue({
      jobId: "job-hub-1",
      accepted: true,
      status: "PENDING",
    });

    const result = await enqueueStudioHubProjectPatchJob("hub-1", { status: "PUBLISHED" });
    expect(enqueueMirotechHubPatchJob).toHaveBeenCalled();
    expect(result).toEqual({ accepted: true, jobId: "job-hub-1", reused: undefined });
  });

  it("returns cached hub project when reused job completed", async () => {
    vi.mocked(enqueueMirotechHubPatchJob).mockResolvedValue({
      jobId: "job-hub-1",
      accepted: true,
      reused: true,
      status: "COMPLETED",
    });
    vi.mocked(defaultJobService.getStatus).mockResolvedValue({
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
    });

    const result = await enqueueStudioHubProjectPatchJob("hub-1", { status: "PUBLISHED" });
    expect(result).toMatchObject({ id: "hub-1" });
  });
});

describe("enqueueStudioHubBlogPatchJob", () => {
  beforeEach(() => {
    vi.mocked(enqueueMirotechHubPatchJob).mockReset();
    vi.mocked(defaultJobService.getStatus).mockReset();
  });

  it("returns accepted jobId for journal patch", async () => {
    vi.mocked(enqueueMirotechHubPatchJob).mockResolvedValue({
      jobId: "job-blog-1",
      accepted: true,
      status: "PENDING",
    });

    const result = await enqueueStudioHubBlogPatchJob("hub-1", { title: "Blog" });
    expect(result).toEqual({ accepted: true, jobId: "job-blog-1", reused: undefined });
  });
});
