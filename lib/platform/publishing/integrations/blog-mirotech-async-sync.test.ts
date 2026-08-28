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
  enqueueMirotechJournalSyncJob: vi.fn(),
}));

const savedJobs = process.env.PLATFORM_JOBS_ENABLED;

beforeEach(() => {
  process.env.PLATFORM_JOBS_ENABLED = "true";
});

afterEach(() => {
  if (savedJobs === undefined) delete process.env.PLATFORM_JOBS_ENABLED;
  else process.env.PLATFORM_JOBS_ENABLED = savedJobs;
});

import { enqueueMirotechJournalSyncJob } from "@/lib/platform/jobs/publishing-enqueue";
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
    vi.mocked(enqueueMirotechJournalSyncJob).mockReset();
    vi.mocked(defaultJobService.getStatus).mockReset();
  });

  it("enqueues and returns accepted result without inline drain", async () => {
    vi.mocked(enqueueMirotechJournalSyncJob).mockResolvedValue({
      jobId: "job-1",
      accepted: true,
      status: "PENDING",
    });

    const result = await jobPlatformSyncBlogPostsMirotech([samplePost]);

    expect(enqueueMirotechJournalSyncJob).toHaveBeenCalled();
    expect(result.results[0]).toMatchObject({ postId: "post-1", accepted: true, jobId: "job-1" });
  });
});
