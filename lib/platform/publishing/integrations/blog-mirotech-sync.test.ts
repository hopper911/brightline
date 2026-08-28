import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/dual-brand/sync-journal", () => ({
  syncBlogPostsToMirotech: vi.fn(),
}));

vi.mock("@/lib/platform/audit/record-safely", () => ({
  recordAuditSafely: vi.fn().mockResolvedValue({ ok: true, skipped: true }),
}));

import { syncBlogPostsToMirotech } from "@/lib/dual-brand/sync-journal";
import { recordAuditSafely } from "@/lib/platform/audit/record-safely";
import type { DefaultPublishingService } from "@/lib/platform/publishing/default-publishing-service";
import {
  legacySyncBlogPostsMirotech,
  platformSyncBlogPostsMirotech,
  resolveBlogPostsMirotechSync,
} from "@/lib/platform/publishing/integrations/blog-mirotech-sync";

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

describe("blog mirotech sync integration", () => {
  const savedFlag = process.env.PLATFORM_PUBLISHING_ENABLED;

  beforeEach(() => {
    vi.mocked(syncBlogPostsToMirotech).mockReset();
    vi.mocked(recordAuditSafely).mockClear();
  });

  afterEach(() => {
    if (savedFlag === undefined) delete process.env.PLATFORM_PUBLISHING_ENABLED;
    else process.env.PLATFORM_PUBLISHING_ENABLED = savedFlag;
  });

  it("legacy path delegates to syncBlogPostsToMirotech", async () => {
    vi.mocked(syncBlogPostsToMirotech).mockResolvedValue({
      posts: [samplePost],
      results: [{ postId: "post-1", ok: true, mirotechJournalId: "j-1" }],
    });
    const result = await legacySyncBlogPostsMirotech([samplePost]);
    expect(syncBlogPostsToMirotech).toHaveBeenCalledWith([samplePost]);
    expect(result.results[0]?.ok).toBe(true);
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

  it("resolveBlogPostsMirotechSync uses platform when flag on", async () => {
    process.env.PLATFORM_PUBLISHING_ENABLED = "true";
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
