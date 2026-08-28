import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

import {
  legacyResolveAdminWorkPreviewContext,
  platformResolveAdminWorkPreviewContext,
  resolveAdminWorkPreviewContext,
} from "@/lib/platform/content/integrations/admin-work-preview-context";
import type { DefaultContentService } from "@/lib/platform/content/default-content-service";

const sampleRow = {
  id: "wp-1",
  section: "ACD" as const,
  pillarSlug: "architecture",
  title: "Glass Tower",
  slug: "glass-tower",
  summary: "Summary",
  location: "NYC",
  year: 2024,
  published: true,
  isFeatured: false,
  sortOrder: 0,
  seoTitle: null,
  metaDescription: null,
  updatedAt: new Date("2024-06-01T00:00:00.000Z"),
  createdAt: new Date("2024-05-01T00:00:00.000Z"),
};

vi.mock("@/lib/platform/content/integrations/default-brightline-content-read", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/lib/platform/content/integrations/default-brightline-content-read")
    >();
  return {
    ...actual,
    fetchBrightlineWorkProjectById: vi.fn(),
  };
});

vi.mock("@/lib/work-pillar-settings", () => ({
  sectionToPillarSlug: vi.fn(async () => "architecture"),
  getPillarBySlug: vi.fn(async () => ({ slug: "architecture", label: "Architecture" })),
}));

import { fetchBrightlineWorkProjectById } from "@/lib/platform/content/integrations/default-brightline-content-read";

describe("admin work preview context", () => {
  const savedContentFlag = process.env.PLATFORM_CONTENT_ENABLED;

  beforeEach(() => {
    vi.mocked(fetchBrightlineWorkProjectById).mockReset();
  });

  afterEach(() => {
    if (savedContentFlag === undefined) delete process.env.PLATFORM_CONTENT_ENABLED;
    else process.env.PLATFORM_CONTENT_ENABLED = savedContentFlag;
  });

  it("legacy path returns admin preview contract", async () => {
    vi.mocked(fetchBrightlineWorkProjectById).mockResolvedValue(sampleRow);
    const result = await legacyResolveAdminWorkPreviewContext("wp-1");
    expect(result).toEqual({
      title: "Glass Tower",
      published: true,
      pillarSlug: "architecture",
      pillarLabel: "Architecture",
      liveHref: "/work/architecture/glass-tower",
    });
  });

  it("legacy path returns null when project missing", async () => {
    vi.mocked(fetchBrightlineWorkProjectById).mockResolvedValue(null);
    await expect(legacyResolveAdminWorkPreviewContext("missing")).resolves.toBeNull();
  });

  it("platform path maps ContentService summary to same contract", async () => {
    const contentService = {
      resolveReference: vi.fn().mockResolvedValue({
        ref: { tenant: "brightline", type: "work-project", id: "wp-1" },
        title: "Glass Tower",
        slug: "glass-tower",
        lifecycle: "published",
        publicPath: "https://brightlinephotography.com/work/architecture/glass-tower",
        updatedAt: "2024-06-01T00:00:00.000Z",
        publishedAt: "2024-06-01T00:00:00.000Z",
        operational: { pillarSlug: "architecture", section: "ACD" },
      }),
    } as unknown as DefaultContentService;

    const result = await platformResolveAdminWorkPreviewContext("wp-1", contentService);
    expect(result).toEqual({
      title: "Glass Tower",
      published: true,
      pillarSlug: "architecture",
      pillarLabel: "Architecture",
      liveHref: "/work/architecture/glass-tower",
    });
  });

  it("resolveAdminWorkPreviewContext uses legacy when flag off", async () => {
    delete process.env.PLATFORM_CONTENT_ENABLED;
    vi.mocked(fetchBrightlineWorkProjectById).mockResolvedValue({ ...sampleRow, published: false });
    const result = await resolveAdminWorkPreviewContext("wp-1");
    expect(result?.published).toBe(false);
    expect(result?.liveHref).toBeNull();
  });

  it("resolveAdminWorkPreviewContext uses platform when flag on", async () => {
    process.env.PLATFORM_CONTENT_ENABLED = "true";
    const contentService = {
      resolveReference: vi.fn().mockResolvedValue({
        ref: { tenant: "brightline", type: "work-project", id: "wp-1" },
        title: "Glass Tower",
        slug: "glass-tower",
        lifecycle: "published",
        publicPath: null,
        updatedAt: null,
        publishedAt: null,
        operational: { pillarSlug: "architecture", section: "ACD" },
      }),
    } as unknown as DefaultContentService;

    const result = await resolveAdminWorkPreviewContext("wp-1", { contentService });
    expect(contentService.resolveReference).toHaveBeenCalled();
    expect(result?.title).toBe("Glass Tower");
  });

  it("legacy and platform parity for published project shape", async () => {
    vi.mocked(fetchBrightlineWorkProjectById).mockResolvedValue(sampleRow);
    const legacy = await legacyResolveAdminWorkPreviewContext("wp-1");

    const contentService = {
      resolveReference: vi.fn().mockResolvedValue({
        ref: { tenant: "brightline", type: "work-project", id: "wp-1" },
        title: sampleRow.title,
        slug: sampleRow.slug,
        lifecycle: "published",
        publicPath: null,
        updatedAt: sampleRow.updatedAt.toISOString(),
        publishedAt: sampleRow.updatedAt.toISOString(),
        operational: { pillarSlug: "architecture", section: "ACD" },
      }),
    } as unknown as DefaultContentService;
    const platform = await platformResolveAdminWorkPreviewContext("wp-1", contentService);

    expect(platform).toEqual(legacy);
  });
});
