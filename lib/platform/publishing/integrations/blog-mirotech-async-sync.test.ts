import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/platform/audit/record-safely", () => ({
  recordAuditSafely: vi.fn().mockResolvedValue({ ok: true, skipped: true }),
}));

vi.mock("@/lib/platform/jobs/default-job-service", () => ({
  defaultJobService: {
    enqueue: vi.fn(),
    getStatus: vi.fn(),
    runJob: vi.fn(),
  },
  createMemoryJobService: vi.fn(),
}));

const savedJobs = process.env.PLATFORM_JOBS_ENABLED;

beforeEach(() => {
  process.env.PLATFORM_JOBS_ENABLED = "true";
});

afterEach(() => {
  if (savedJobs === undefined) delete process.env.PLATFORM_JOBS_ENABLED;
  else process.env.PLATFORM_JOBS_ENABLED = savedJobs;
});

import { recordAuditSafely } from "@/lib/platform/audit/record-safely";
import { defaultJobService } from "@/lib/platform/jobs/default-job-service";
import { jobPlatformSyncBlogPostsMirotech } from "@/lib/platform/publishing/integrations/blog-mirotech-async-sync";

const samplePost = {
  id: "post-1",
  slug: "sample",
  title: "Sample",
  excerpt: "",
  body: "",
  author: "Author",
  status: "PUBLISHED" as const,
  publishToMirotech: true,
  mirotechJournalId: "",
  tags: [],
  format: "journal" as const,
  featureOnHome: false,
  coverImageUrl: null,
  galleryImages: [],
  galleryBlocks: [],
  sectionOrder: [],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("jobPlatformSyncBlogPostsMirotech", () => {
  beforeEach(() => {
    vi.mocked(defaultJobService.enqueue).mockReset();
    vi.mocked(defaultJobService.getStatus).mockReset();
    vi.mocked(defaultJobService.runJob).mockReset();
    vi.mocked(recordAuditSafely).mockClear();
  });

  it("enqueues, drains worker, and returns mirotech sync outcome", async () => {
    vi.mocked(defaultJobService.enqueue).mockResolvedValue({ jobId: "job-1", status: "PENDING" });
    vi.mocked(defaultJobService.getStatus).mockResolvedValue({
      id: "job-1",
      tenantSlug: "brightline",
      type: "publishing.mirotech.journal.sync",
      status: "PENDING",
      payload: {},
      attempts: 0,
      idempotencyKey: "k1",
      createdAt: "2024-01-01T00:00:00.000Z",
      startedAt: null,
      completedAt: null,
      failedAt: null,
      errorSummary: null,
    });
    vi.mocked(defaultJobService.runJob).mockResolvedValue({
      id: "job-1",
      tenantSlug: "brightline",
      type: "publishing.mirotech.journal.sync",
      status: "COMPLETED",
      payload: { result: { ok: true, resourceId: "journal-9" } },
      attempts: 1,
      idempotencyKey: "k1",
      createdAt: "2024-01-01T00:00:00.000Z",
      startedAt: "2024-01-01T00:00:00.000Z",
      completedAt: "2024-01-01T00:00:00.000Z",
      failedAt: null,
      errorSummary: null,
    });

    const result = await jobPlatformSyncBlogPostsMirotech([samplePost]);

    expect(defaultJobService.enqueue).toHaveBeenCalled();
    expect(defaultJobService.runJob).toHaveBeenCalledWith(
      expect.objectContaining({ tenant: expect.objectContaining({ slug: "brightline" }) }),
      "job-1"
    );
    expect(result.results[0]).toMatchObject({ ok: true, mirotechJournalId: "journal-9" });
    expect(result.posts[0]?.mirotechJournalId).toBe("journal-9");
    expect(vi.mocked(recordAuditSafely).mock.calls.some((c) => c[0].action === "publishing.queued")).toBe(
      true
    );
  });
});
