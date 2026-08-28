import { describe, expect, it } from "vitest";
import {
  brightlinePortfolioProjectPublicPath,
  brightlineWorkProjectPublicPath,
  mapPortfolioProjectToSnapshot,
  mapWorkProjectToSnapshot,
} from "@/lib/platform/content/integrations/map-brightline-content";
import { BRIGHTLINE_EXCLUDED_PLATFORM_FIELDS } from "@/lib/platform/content/dto/brightline-public-content";

describe("map-brightline-content", () => {
  it("builds brightline public paths", () => {
    expect(brightlineWorkProjectPublicPath("architecture", "glass-tower")).toBe(
      "https://brightlinephotography.com/work/architecture/glass-tower"
    );
    expect(brightlinePortfolioProjectPublicPath("corporate", "annual-report")).toBe(
      "https://brightlinephotography.com/portfolio/corporate/annual-report"
    );
  });

  it("maps work snapshot with marketing fields only", () => {
    const snapshot = mapWorkProjectToSnapshot({
      id: "wp-1",
      section: "ACD",
      pillarSlug: "architecture",
      title: "Title",
      slug: "slug",
      summary: "Summary",
      location: "NYC",
      year: 2024,
      published: true,
      isFeatured: false,
      sortOrder: 0,
      seoTitle: null,
      metaDescription: null,
      updatedAt: new Date(),
      createdAt: new Date(),
    });
    expect(snapshot.section).toBe("ACD");
    for (const key of BRIGHTLINE_EXCLUDED_PLATFORM_FIELDS) {
      expect(snapshot).not.toHaveProperty(key);
    }
  });

  it("maps portfolio snapshot with image count not URLs", () => {
    const snapshot = mapPortfolioProjectToSnapshot({
      id: "pp-1",
      title: "T",
      slug: "s",
      categorySlug: "arc",
      location: null,
      year: "2024",
      description: "D",
      published: true,
      seoTitle: null,
      seoDescription: null,
      coverAlt: null,
      imageCount: 5,
      updatedAt: new Date(),
      createdAt: new Date(),
    });
    expect(snapshot.imageCount).toBe(5);
    expect(snapshot).not.toHaveProperty("coverUrl");
    expect(snapshot).not.toHaveProperty("storageKey");
  });
});
