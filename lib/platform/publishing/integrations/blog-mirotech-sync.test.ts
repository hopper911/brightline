import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/platform/publishing/mirotech/journal-ingest", () => ({
  syncBlogPostsToMirotech: vi.fn(),
}));

vi.mock("@/lib/platform/audit/record-safely", () => ({
  recordAuditSafely: vi.fn().mockResolvedValue({ ok: true, skipped: true }),
}));

vi.mock("@/lib/platform/publishing/integrations/blog-mirotech-async-sync", () => ({
  jobPlatformSyncBlogPostsMirotech: vi.fn(),
}));

import { blankBlogPost, type BlogPost } from "@/lib/blog-post-model";
import { syncBlogPostsToMirotech } from "@/lib/platform/publishing/mirotech/journal-ingest";
import { recordAuditSafely } from "@/lib/platform/audit/record-safely";
import { jobPlatformSyncBlogPostsMirotech } from "@/lib/platform/publishing/integrations/blog-mirotech-async-sync";
import type { DefaultPublishingService } from "@/lib/platform/publishing/default-publishing-service";
import {
  legacySyncBlogPostsMirotech,
  platformSyncBlogPostsMirotech,
  resolveBlogPostsMirotechSync,
} from "@/lib/platform/publishing/integrations/blog-mirotech-sync";

const samplePost: BlogPost = {
  ...blankBlogPost("Sample"),
  id: "post-1",
  slug: "sample",
  status: "PUBLISHED",
  publishToMirotech: true,
  mirotechJournalId: "",
};

describe("blog mirotech sync integration", () => {
  const savedPublishing = process.env.PLATFORM_PUBLISHING_ENABLED;
  const savedJobs = process.env.PLATFORM_JOBS_ENABLED;

  beforeEach(() => {
    vi.mocked(syncBlogPostsToMirotech).mockReset();
    vi.mocked(recordAuditSafely).mockClear();
  });

  afterEach(() => {
    if (savedPublishing === undefined) delete process.env.PLATFORM_PUBLISHING_ENABLED;
    else process.env.PLATFORM_PUBLISHING_ENABLED = savedPublishing;
    if (savedJobs === undefined) delete process.env.PLATFORM_JOBS_ENABLED;
    else process.env.PLATFORM_JOBS_ENABLED = savedJobs;
  });

  it("legacy path delegates to syncBlogPostsToMirotech", async () => {
    vi.mocked(syncBlogPostsToMirotech).mockResolvedValue({
      posts: [samplePost],
      results: [{ postId: "post-1", ok: true, mirotechJournalId: "j-1" }],
    });
    const result = await legacySyncBlogPostsMirotech([samplePost]);
    expect(syncBlogPostsToMirotech).toHaveBeenCalledWith([samplePost]);
    expect(result.results[0] && "ok" in result.results[0] && result.results[0].ok).toBe(true);
  });

  it("resolveBlogPostsMirotechSync uses legacy when flag off", async () => {
    delete process.env.PLATFORM_PUBLISHING_ENABLED;
    vi.mocked(syncBlogPostsToMirotech).mockResolvedValue({
      posts: [samplePost],
      results: [{ postId: "post-1", ok: true, mirotechJournalId: "j-1" }],
    });
    await resolveBlogPostsMirotechSync([samplePost]);
    expect(syncBlogPostsToMirotech).toHaveBeenCalled();
  });

  it("resolveBlogPostsMirotechSync uses job path when publishing and jobs enabled", async () => {
    process.env.PLATFORM_PUBLISHING_ENABLED = "true";
    process.env.PLATFORM_JOBS_ENABLED = "true";
    vi.mocked(jobPlatformSyncBlogPostsMirotech).mockResolvedValue({
      posts: [{ ...samplePost, mirotechJournalId: "job-j-1" }],
      results: [{ postId: "post-1", ok: true, mirotechJournalId: "job-j-1" }],
    });

    const result = await resolveBlogPostsMirotechSync([samplePost]);
    expect(jobPlatformSyncBlogPostsMirotech).toHaveBeenCalled();
    const first = result.results[0];
    expect(first && "mirotechJournalId" in first && first.mirotechJournalId).toBe("job-j-1");
  });

  it("resolveBlogPostsMirotechSync uses platform sync when jobs disabled", async () => {
    process.env.PLATFORM_PUBLISHING_ENABLED = "true";
    delete process.env.PLATFORM_JOBS_ENABLED;
    const publishingService = {
      publish: vi.fn().mockResolvedValue({
        outcome: "completed",
        resourceId: "journal-9",
        request: {
          source: { tenant: "brightline", type: "blog-post", id: "post-1" },
          target: "mirotech-site",
          operation: "sync",
        },
      }),
    } as unknown as DefaultPublishingService;

    const result = await resolveBlogPostsMirotechSync([samplePost], { publishingService });
    expect(publishingService.publish).toHaveBeenCalled();
    expect(syncBlogPostsToMirotech).not.toHaveBeenCalled();
    expect(result.results[0]).toMatchObject({ ok: true, mirotechJournalId: "journal-9" });
    expect(result.posts[0]?.mirotechJournalId).toBe("journal-9");
  });

  it("platform path records publishing audit events", async () => {
    const publishingService = {
      publish: vi.fn().mockResolvedValue({
        outcome: "completed",
        resourceId: "journal-9",
      }),
    } as unknown as DefaultPublishingService;

    await platformSyncBlogPostsMirotech([samplePost], publishingService);
    const actions = vi.mocked(recordAuditSafely).mock.calls.map((c) => c[0].action);
    expect(actions).toContain("publishing.started");
    expect(actions).toContain("publishing.completed");
  });

  it("platform path maps failed publish to sync result", async () => {
    const publishingService = {
      publish: vi.fn().mockResolvedValue({
        outcome: "failed",
        message: "Ingest rejected",
      }),
    } as unknown as DefaultPublishingService;

    const result = await platformSyncBlogPostsMirotech([samplePost], publishingService);
    expect(result.results[0]).toMatchObject({ ok: false, error: "Ingest rejected" });
    expect(vi.mocked(recordAuditSafely).mock.calls.some((c) => c[0].action === "publishing.failed")).toBe(
      true
    );
  });

  it("skips posts without mirotech opt-in or prior journal id", async () => {
    const publishingService = { publish: vi.fn() } as unknown as DefaultPublishingService;
    await platformSyncBlogPostsMirotech(
      [{ ...samplePost, publishToMirotech: false, mirotechJournalId: "" }],
      publishingService
    );
    expect(publishingService.publish).not.toHaveBeenCalled();
  });

  it("legacy and platform parity shape for successful sync", async () => {
    vi.mocked(syncBlogPostsToMirotech).mockResolvedValue({
      posts: [{ ...samplePost, mirotechJournalId: "j-1" }],
      results: [{ postId: "post-1", ok: true, mirotechJournalId: "j-1" }],
    });
    const legacy = await legacySyncBlogPostsMirotech([samplePost]);

    const publishingService = {
      publish: vi.fn().mockResolvedValue({
        outcome: "completed",
        resourceId: "j-1",
      }),
    } as unknown as DefaultPublishingService;
    const platform = await platformSyncBlogPostsMirotech([samplePost], publishingService);

    expect(platform.results).toEqual(legacy.results);
    expect(platform.posts[0]?.mirotechJournalId).toBe(legacy.posts[0]?.mirotechJournalId);
  });
});
