import { describe, expect, it } from "vitest";
import {
  extractMediaRefsFromJournalPost,
  extractMediaRefsFromWorkProject,
  inferVaultForMediaKey,
  normalizeCmsMediaKey,
} from "./admin-r2-mirotech-cms-keys";
import type { DualBrandJournalPost, DualBrandWorkProject } from "@/lib/dual-brand/content-api";
import { mirotechAllMediaSourceLabel } from "./admin-r2-mirotech-all-media";

describe("admin-r2-mirotech-cms-keys", () => {
  it("normalizes R2 keys and rejects unrelated URLs", () => {
    expect(normalizeCmsMediaKey("portfolio/cor/web_full/cor-260812-11.webp")).toBe(
      "portfolio/cor/web_full/cor-260812-11.webp"
    );
    expect(normalizeCmsMediaKey("https://example.com/foo.webp")).toBeNull();
    expect(normalizeCmsMediaKey("/about")).toBeNull();
  });

  it("infers vault from key prefix", () => {
    expect(inferVaultForMediaKey("portfolio/cor/web_full/x.webp")).toBe("brightline");
    expect(inferVaultForMediaKey("mirotech/product/web_full/x.webp")).toBe("brightline");
    expect(inferVaultForMediaKey("site/backgrounds/web/x.mp4")).toBe("mirotech-site");
    expect(inferVaultForMediaKey("projects/foo/hero.webp")).toBe("mirotech-site");
  });

  it("extracts keys from mirotech-ops-intelligence-shaped project", () => {
    const project: DualBrandWorkProject = {
      id: "1",
      title: "MiroTech Ops Intelligence",
      slug: "mirotech-ops-intelligence",
      summary: "s",
      year: 2026,
      categories: [],
      disciplines: [],
      featured: true,
      sortOrder: 0,
      heroImage: "portfolio/cor/web_full/cor-260812-11.webp",
      thumbnailImage: "portfolio/cor/web_full/cor-260812-11.webp",
      sections: [
        {
          id: "g1",
          type: "gallery",
          title: "Photography and design system",
          data: {
            images: [
              { src: "portfolio/cor/web_full/cor-260812-09.webp" },
              { src: "portfolio/cor/web_full/cor-260812-08.webp" },
            ],
          },
        },
      ],
    };
    const refs = extractMediaRefsFromWorkProject(project);
    const keys = refs.map((r) => r.key);
    expect(keys).toContain("portfolio/cor/web_full/cor-260812-11.webp");
    expect(keys).toContain("portfolio/cor/web_full/cor-260812-09.webp");
    expect(refs.every((r) => r.vault === "brightline")).toBe(true);
    expect(refs.some((r) => r.sourceLabel.includes("mirotech-ops-intelligence"))).toBe(true);
  });

  it("extracts video keys from Noros-shaped project", () => {
    const project: DualBrandWorkProject = {
      id: "2",
      title: "Noros",
      slug: "n",
      summary: "s",
      year: 2026,
      categories: [],
      disciplines: [],
      featured: false,
      sortOrder: 0,
      sections: [
        {
          id: "v1",
          type: "video",
          data: {
            src: "portfolio/arc/web_video/arc-260825-01.mp4",
            poster: "portfolio/arc/web_video/arc-260825-01-poster.webp",
          },
        },
        {
          id: "v2",
          type: "video",
          title: "Creative strategy",
          data: { src: "portfolio/cor/web_video/cor-260826-02.mp4" },
        },
      ],
    };
    const keys = extractMediaRefsFromWorkProject(project).map((r) => r.key);
    expect(keys).toContain("portfolio/arc/web_video/arc-260825-01.mp4");
    expect(keys).toContain("portfolio/arc/web_video/arc-260825-01-poster.webp");
    expect(keys).toContain("portfolio/cor/web_video/cor-260826-02.mp4");
  });

  it("extracts journal gallery keys", () => {
    const post: DualBrandJournalPost = {
      id: "j1",
      title: "Post",
      slug: "post",
      excerpt: "e",
      categories: [],
      tags: [],
      featured: false,
      heroImage: "journal/foo/hero.webp",
      articlePayload: {
        galleryImages: [{ url: "site/backgrounds/web/bg.mp4" }],
      },
    };
    const refs = extractMediaRefsFromJournalPost(post);
    expect(refs.map((r) => r.key)).toEqual(
      expect.arrayContaining(["journal/foo/hero.webp", "site/backgrounds/web/bg.mp4"])
    );
    expect(refs.find((r) => r.key.startsWith("site/"))?.vault).toBe("mirotech-site");
  });
});

describe("admin-r2-mirotech-all-media labels", () => {
  it("labels portfolio pillar paths", () => {
    expect(
      mirotechAllMediaSourceLabel("portfolio/cor/web_full/cor-260812-11.webp", "brightline")
    ).toBe("Brightline portfolio · cor · web_full");
    expect(
      mirotechAllMediaSourceLabel("portfolio/arc/web_video/arc-260825-01.mp4", "brightline")
    ).toBe("Brightline portfolio · arc · web_video");
  });

  it("prefers CMS ref label when provided", () => {
    expect(
      mirotechAllMediaSourceLabel("portfolio/cor/web_full/x.webp", "brightline", {
        sourceLabel: "CMS · mirotech-ops-intelligence · heroImage",
      })
    ).toBe("CMS · mirotech-ops-intelligence · heroImage");
  });
});
