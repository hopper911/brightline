import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/platform/content/default-content-service", () => ({
  defaultContentService: {
    listPublished: vi.fn(),
  },
}));

import { defaultContentService } from "@/lib/platform/content/default-content-service";
import { listStudioContentForTenant } from "@/lib/studio/content/list-studio-content";

describe("listStudioContentForTenant", () => {
  const saved = process.env.PLATFORM_CONTENT_ENABLED;

  beforeEach(() => {
    process.env.PLATFORM_CONTENT_ENABLED = "true";
    vi.mocked(defaultContentService.listPublished).mockReset();
  });

  afterEach(() => {
    if (saved === undefined) delete process.env.PLATFORM_CONTENT_ENABLED;
    else process.env.PLATFORM_CONTENT_ENABLED = saved;
  });

  it("returns disabled when content flag is off", async () => {
    delete process.env.PLATFORM_CONTENT_ENABLED;
    const listing = await listStudioContentForTenant("brightline");
    expect(listing.enabled).toBe(false);
    expect(listing.sections).toEqual([]);
  });

  it("lists brightline adapter types", async () => {
    vi.mocked(defaultContentService.listPublished)
      .mockResolvedValueOnce({ items: [{ ref: { tenant: "brightline", type: "work-project", id: "1" }, title: "A", slug: "a", lifecycle: "draft", publicPath: null, updatedAt: null, publishedAt: null }] })
      .mockResolvedValueOnce({ items: [] });

    const listing = await listStudioContentForTenant("brightline");
    expect(listing.sections).toHaveLength(2);
    expect(listing.sections[0]?.result.items[0]?.title).toBe("A");
    expect(defaultContentService.listPublished).toHaveBeenCalledWith(
      expect.objectContaining({ tenant: expect.objectContaining({ slug: "brightline" }) }),
      "work-project",
      undefined
    );
  });

  it("lists mirotech adapter types", async () => {
    vi.mocked(defaultContentService.listPublished).mockResolvedValue({ items: [] });
    const listing = await listStudioContentForTenant("mirotech");
    expect(listing.sections.map((s) => s.type)).toEqual([
      "dual-brand-work",
      "mirotech-case-study",
    ]);
  });
});
