import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

import { MirotechPublishingAdapter } from "@/lib/platform/publishing/adapters/mirotech-publishing-adapter";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import {
  PublishingNotConfiguredError,
  PublishingNotFoundError,
  PublishingValidationError,
} from "@/lib/platform/publishing/errors";
import type {
  MirotechPublishingReadPort,
  MirotechPublishingWritePort,
} from "@/lib/platform/publishing/integrations/mirotech-publishing-port";

const samplePost = {
  id: "post-1",
  slug: "sample-post",
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

describe("MirotechPublishingAdapter", () => {
  const readPort: MirotechPublishingReadPort = {
    getBlogPostById: vi.fn(),
  };
  const writePort: MirotechPublishingWritePort = {
    isJournalSyncConfigured: vi.fn().mockReturnValue(true),
    syncBlogPostToMirotech: vi.fn(),
    updateHubProject: vi.fn(),
    updateHubBlog: vi.fn(),
  };
  const adapter = new MirotechPublishingAdapter(readPort, writePort);
  const context = createPlatformContextForTenant("brightline");

  beforeEach(() => {
    vi.mocked(readPort.getBlogPostById).mockReset();
    vi.mocked(writePort.syncBlogPostToMirotech).mockReset();
    vi.mocked(writePort.isJournalSyncConfigured).mockReturnValue(true);
  });

  it("supports brightline blog-post to mirotech-site", () => {
    expect(
      adapter.supports({
        source: { tenant: "brightline", type: "blog-post", id: "post-1" },
        target: "mirotech-site",
        operation: "sync",
      })
    ).toBe(true);
    expect(
      adapter.supports({
        source: { tenant: "brightline", type: "work-project", id: "wp-1" },
        target: "mirotech-site",
        operation: "sync",
      })
    ).toBe(false);
  });

  it("sync delegates to existing syncBlogPostToMirotech with loaded post", async () => {
    vi.mocked(readPort.getBlogPostById).mockResolvedValue(samplePost);
    vi.mocked(writePort.syncBlogPostToMirotech).mockResolvedValue({
      postId: "post-1",
      ok: true,
      mirotechJournalId: "journal-1",
    });

    const result = await adapter.publish(context, {
      source: { tenant: "brightline", type: "blog-post", id: "post-1" },
      target: "mirotech-site",
      operation: "sync",
    });

    expect(writePort.syncBlogPostToMirotech).toHaveBeenCalledWith(samplePost);
    expect(result.outcome).toBe("completed");
    expect(result.resourceId).toBe("journal-1");
  });

  it("unpublish passes publishToMirotech false to sync client", async () => {
    vi.mocked(readPort.getBlogPostById).mockResolvedValue(samplePost);
    vi.mocked(writePort.syncBlogPostToMirotech).mockResolvedValue({
      postId: "post-1",
      ok: true,
      mirotechJournalId: "journal-1",
    });

    await adapter.publish(context, {
      source: { tenant: "brightline", type: "blog-post", id: "post-1" },
      target: "mirotech-site",
      operation: "unpublish",
    });

    expect(writePort.syncBlogPostToMirotech).toHaveBeenCalledWith({
      ...samplePost,
      publishToMirotech: false,
    });
  });

  it("publish validates opt-in and published status", async () => {
    vi.mocked(readPort.getBlogPostById).mockResolvedValue({
      ...samplePost,
      publishToMirotech: false,
    });

    await expect(
      adapter.publish(context, {
        source: { tenant: "brightline", type: "blog-post", id: "post-1" },
        target: "mirotech-site",
        operation: "publish",
      })
    ).rejects.toBeInstanceOf(PublishingValidationError);
  });

  it("throws not found when blog post missing", async () => {
    vi.mocked(readPort.getBlogPostById).mockResolvedValue(null);

    await expect(
      adapter.publish(context, {
        source: { tenant: "brightline", type: "blog-post", id: "missing" },
        target: "mirotech-site",
        operation: "sync",
      })
    ).rejects.toBeInstanceOf(PublishingNotFoundError);
  });

  it("throws not configured when sync secret missing", async () => {
    vi.mocked(writePort.isJournalSyncConfigured).mockReturnValue(false);

    await expect(
      adapter.publish(context, {
        source: { tenant: "brightline", type: "blog-post", id: "post-1" },
        target: "mirotech-site",
        operation: "sync",
      })
    ).rejects.toBeInstanceOf(PublishingNotConfiguredError);
  });

  it("returns failed result when sync client reports ok false", async () => {
    vi.mocked(readPort.getBlogPostById).mockResolvedValue(samplePost);
    vi.mocked(writePort.syncBlogPostToMirotech).mockResolvedValue({
      postId: "post-1",
      ok: false,
      error: "Ingest rejected",
    });

    const result = await adapter.publish(context, {
      source: { tenant: "brightline", type: "blog-post", id: "post-1" },
      target: "mirotech-site",
      operation: "sync",
    });

    expect(result.outcome).toBe("failed");
    expect(result.message).toBe("Ingest rejected");
  });
});
