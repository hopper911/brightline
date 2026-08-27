import { describe, expect, it } from "vitest";
import { extractMediaRefsFromWorkProject } from "@/lib/admin-r2-mirotech-cms-keys";

describe("admin media library mirotech refs", () => {
  it("extracts hero video keys from work project shape", () => {
    const refs = extractMediaRefsFromWorkProject({
      id: "1",
      title: "Test",
      slug: "test",
      summary: "",
      year: 2026,
      categories: [],
      disciplines: [],
      featured: false,
      sortOrder: 0,
      heroImage: "mirotech/portfolio/cor/web_video/hero.mp4",
      sections: [
        {
          id: "s1",
          type: "gallery",
          data: {
            images: ["portfolio/cor/web_full/a.webp"],
          },
        },
      ],
    });
    expect(refs.some((r) => r.key.endsWith("hero.mp4"))).toBe(true);
    expect(refs.some((r) => r.key.includes("web_full/a.webp"))).toBe(true);
  });
});
