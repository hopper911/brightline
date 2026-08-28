import { describe, expect, it, vi } from "vitest";
import { BrightlineContentAdapter } from "@/lib/platform/content/adapters/brightline-content-adapter";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import {
  BRIGHTLINE_EXCLUDED_PLATFORM_FIELDS,
} from "@/lib/platform/content/dto/brightline-public-content";
import {
  ContentNotFoundError,
  ContentTenantMismatchError,
  ContentUnsupportedTypeError,
} from "@/lib/platform/content/errors";
import type { BrightlineContentReadPort } from "@/lib/platform/content/integrations/brightline-content-read-port";

const brightlineContext = createPlatformContextForTenant("brightline");

const sampleWork = {
  id: "wp-1",
  section: "ACD" as const,
  pillarSlug: "architecture",
  title: "Glass Tower",
  slug: "glass-tower",
  summary: "Public summary",
  location: "NYC",
  year: 2024,
  published: true,
  isFeatured: true,
  sortOrder: 0,
  seoTitle: "SEO",
  metaDescription: "Meta",
  updatedAt: new Date("2024-06-01T00:00:00.000Z"),
  createdAt: new Date("2024-05-01T00:00:00.000Z"),
};

const samplePortfolio = {
  id: "pp-1",
  title: "Legacy Portfolio",
  slug: "legacy-slug",
  categorySlug: "architecture",
  location: "NJ",
  year: "2023",
  description: "Description",
  published: false,
  seoTitle: null,
  seoDescription: null,
  coverAlt: "Cover",
  imageCount: 3,
  updatedAt: new Date("2023-08-01T00:00:00.000Z"),
  createdAt: new Date("2023-07-01T00:00:00.000Z"),
};

function createAdapter(overrides?: Partial<BrightlineContentReadPort>) {
  const port: BrightlineContentReadPort = {
    getWorkProjectById: vi.fn(),
    getPortfolioProjectById: vi.fn(),
    listWorkProjects: vi.fn().mockResolvedValue({ rows: [] }),
    listPortfolioProjects: vi.fn().mockResolvedValue({ rows: [] }),
    ...overrides,
  };
  return { adapter: new BrightlineContentAdapter(port), port };
}

describe("BrightlineContentAdapter", () => {
  it("supports work-project and portfolio-project for brightline tenant only", () => {
    const { adapter } = createAdapter();
    expect(
      adapter.supports({ tenant: "brightline", type: "work-project", id: "wp-1" })
    ).toBe(true);
    expect(
      adapter.supports({ tenant: "brightline", type: "portfolio-project", id: "pp-1" })
    ).toBe(true);
    expect(adapter.supports({ tenant: "brightline", type: "client-gallery", id: "g1" })).toBe(
      false
    );
    expect(adapter.supports({ tenant: "mirotech", type: "work-project", id: "wp-1" })).toBe(
      false
    );
  });

  it("rejects tenant mismatch", async () => {
    const { adapter } = createAdapter();
    await expect(
      adapter.resolveReference(createPlatformContextForTenant("mirotech"), {
        tenant: "mirotech",
        type: "work-project",
        id: "wp-1",
      })
    ).rejects.toThrow(ContentTenantMismatchError);
  });

  it("rejects unsupported private content types", async () => {
    const { adapter } = createAdapter();
    await expect(
      adapter.getPublished(brightlineContext, {
        tenant: "brightline",
        type: "client-gallery",
        id: "gallery-1",
      })
    ).rejects.toThrow(ContentUnsupportedTypeError);
  });

  it("returns null when work project not found", async () => {
    const { adapter, port } = createAdapter({
      getWorkProjectById: vi.fn().mockResolvedValue(null),
    });
    const ref = { tenant: "brightline" as const, type: "work-project" as const, id: "missing" };
    await expect(adapter.getByRef(ref)).resolves.toBeNull();
    expect(port.getWorkProjectById).toHaveBeenCalledWith("missing");
  });

  it("throws ContentNotFoundError in strict mode", async () => {
    const { adapter } = createAdapter({
      getPortfolioProjectById: vi.fn().mockResolvedValue(null),
    });
    await expect(
      adapter.getByRef(
        { tenant: "brightline", type: "portfolio-project", id: "missing" },
        { strict: true }
      )
    ).rejects.toThrow(ContentNotFoundError);
  });

  it("maps published work project without private delivery fields", async () => {
    const { adapter } = createAdapter({
      getWorkProjectById: vi.fn().mockResolvedValue(sampleWork),
    });
    const ref = { tenant: "brightline" as const, type: "work-project" as const, id: "wp-1" };
    const summary = await adapter.resolveReference(brightlineContext, ref);
    expect(summary).toMatchObject({
      title: "Glass Tower",
      lifecycle: "published",
      publicPath: "https://brightlinephotography.com/work/architecture/glass-tower",
    });

    const published = await adapter.getPublished(brightlineContext, ref);
    expect(published?.payload).toMatchObject({
      title: "Glass Tower",
      pillarSlug: "architecture",
      summary: "Public summary",
    });

    for (const key of BRIGHTLINE_EXCLUDED_PLATFORM_FIELDS) {
      expect(published?.payload).not.toHaveProperty(key);
    }

    const status = await adapter.getStatus(brightlineContext, ref);
    expect(status).toMatchObject({ lifecycle: "published", published: true });
  });

  it("returns null published snapshot for draft portfolio project", async () => {
    const { adapter } = createAdapter({
      getPortfolioProjectById: vi.fn().mockResolvedValue(samplePortfolio),
    });
    const ref = { tenant: "brightline" as const, type: "portfolio-project" as const, id: "pp-1" };
    const summary = await adapter.getByRef(ref);
    expect(summary?.lifecycle).toBe("draft");
    expect(summary?.publicPath).toBeNull();

    await expect(adapter.getPublished(brightlineContext, ref)).resolves.toBeNull();

    const publishedPayload = await adapter
      .getByRef(ref)
      .then(() => adapter.getPublished(brightlineContext, ref));
    expect(publishedPayload).toBeNull();
  });

  it("maps portfolio snapshot with image count only", async () => {
    const { adapter } = createAdapter({
      getPortfolioProjectById: vi.fn().mockResolvedValue({ ...samplePortfolio, published: true }),
    });
    const ref = { tenant: "brightline" as const, type: "portfolio-project" as const, id: "pp-1" };
    const published = await adapter.getPublished(brightlineContext, ref);
    expect(published?.payload).toMatchObject({
      imageCount: 3,
      categorySlug: "architecture",
    });
    expect(published?.payload).not.toHaveProperty("images");
    expect(published?.payload).not.toHaveProperty("coverUrl");
  });
});
