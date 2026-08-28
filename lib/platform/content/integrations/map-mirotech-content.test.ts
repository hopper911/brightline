import { describe, expect, it } from "vitest";
import {
  hubLifecycleFromStatus,
  mapHubProjectToCaseStudySnapshot,
  mapWorkProjectToCaseStudySnapshot,
  mirotechCaseStudyPublicPath,
} from "@/lib/platform/content/integrations/map-mirotech-content";

describe("map-mirotech-content", () => {
  it("builds mirotech public work paths", () => {
    expect(mirotechCaseStudyPublicPath("signal-chain")).toBe(
      "https://mirotech.solutions/work/signal-chain"
    );
  });

  it("maps hub lifecycle states", () => {
    expect(hubLifecycleFromStatus("PUBLISHED")).toBe("published");
    expect(hubLifecycleFromStatus("ARCHIVED")).toBe("archived");
    expect(hubLifecycleFromStatus("DRAFT")).toBe("draft");
  });

  it("maps work project to platform snapshot without leaking extra fields", () => {
    const snapshot = mapWorkProjectToCaseStudySnapshot({
      id: "w1",
      title: "Title",
      slug: "slug",
      summary: "Summary",
      year: 2025,
      categories: ["a"],
      disciplines: ["b"],
      featured: false,
      sortOrder: 0,
      heroImage: "projects/hero.webp",
      challenge: "secret internal",
    });
    expect(snapshot).toEqual({
      title: "Title",
      slug: "slug",
      summary: "Summary",
      year: 2025,
      categories: ["a"],
      disciplines: ["b"],
      featured: false,
      heroImageKey: "projects/hero.webp",
      thumbnailImageKey: null,
      seoTitle: null,
      seoDescription: null,
    });
    expect(snapshot).not.toHaveProperty("challenge");
  });

  it("maps hub project snapshot", () => {
    const snapshot = mapHubProjectToCaseStudySnapshot({
      id: "h1",
      title: "Hub",
      slug: "hub-slug",
      summary: "S",
      year: 2024,
      status: "PUBLISHED",
      categories: [],
      disciplines: [],
      tools: [],
      platforms: [],
      publishMirotech: true,
      publishBrightline: false,
      sortOrderMirotech: 0,
      sortOrderBrightline: 0,
      featuredMirotech: true,
      featuredBrightline: false,
      heroImage: "projects/x.webp",
    });
    expect(snapshot.featured).toBe(true);
    expect(snapshot.heroImageKey).toBe("projects/x.webp");
  });
});
