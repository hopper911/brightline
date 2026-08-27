import { describe, expect, it } from "vitest";
import {
  browseBreadcrumbs,
  browseLibraryRoots,
  browseListTargets,
  coercePillarForRoot,
  defaultFolderForRoot,
  filterBrowsePicks,
  folderSegmentLabel,
  matchesT9FolderFilter,
  preferredQualityChildPrefix,
  type R2BrowserPick,
} from "./r2-browser-prefixes";

describe("r2-browser-prefixes", () => {
  it("coerces invalid Brightline pillar under Mirotech to all", () => {
    expect(coercePillarForRoot("mirotech", "architecture")).toBe("all");
    expect(coercePillarForRoot("mirotech", "product")).toBe("product");
    expect(coercePillarForRoot("mirotech", "all")).toBe("all");
    expect(coercePillarForRoot("mirotech", "arc")).toBe("arc");
  });

  it("defaults Mirotech folder to All (mixed)", () => {
    expect(defaultFolderForRoot("mirotech")).toBe("all");
    expect(defaultFolderForRoot("portfolio")).toBe("web_full");
    expect(defaultFolderForRoot("mirotech", "web_video")).toBe("web_video");
  });

  it("library roots lead with portfolio pillars, T9 categories, CMS, unified last", () => {
    const roots = browseLibraryRoots("mirotech");
    expect(roots[0]?.prefix).toBe("portfolio/arc/");
    expect(roots[roots.length - 1]?.special).toBe("all-mirotech-media");
    expect(roots.filter((r) => r.group === "portfolio")).toHaveLength(6);
    expect(roots.filter((r) => r.group === "t9")).toHaveLength(6);
    expect(roots.filter((r) => r.group === "cms")).toHaveLength(4);
    expect(roots.filter((r) => r.vault === "mirotech-site")).toHaveLength(4);
    expect(roots.some((r) => r.prefix === "mirotech/portfolio/cor/")).toBe(true);
    expect(roots.some((r) => r.prefix === "mirotech/product/")).toBe(true);
  });

  it("builds breadcrumbs from prefix", () => {
    expect(browseBreadcrumbs(null)).toEqual([{ label: "Library", prefix: null }]);
    expect(browseBreadcrumbs("portfolio/cor/web_full/", "Mirotech library")).toEqual([
      { label: "Mirotech library", prefix: null },
      { label: "portfolio", prefix: "portfolio/" },
      { label: "cor", prefix: "portfolio/cor/" },
      { label: "web_full", prefix: "portfolio/cor/web_full/" },
    ]);
  });

  it("preferredQualityChildPrefix drills into web_full under pillar roots", () => {
    expect(preferredQualityChildPrefix("portfolio/cor/", "web_full")).toBe(
      "portfolio/cor/web_full/"
    );
    expect(preferredQualityChildPrefix("mirotech/product/", "web_full")).toBe(
      "mirotech/product/web_full/"
    );
    expect(preferredQualityChildPrefix("portfolio/cor/web_full/", "web_full")).toBeNull();
    expect(preferredQualityChildPrefix("portfolio/cor/", "all")).toBeNull();
    expect(preferredQualityChildPrefix("site/backgrounds/", "web_full")).toBeNull();
  });

  it("folderSegmentLabel uses last segment", () => {
    expect(folderSegmentLabel("portfolio/cor/")).toBe("cor");
    expect(folderSegmentLabel("web_full/")).toBe("web_full");
  });

  it("Mirotech + All + web_full lists CMS bucket + portfolio pillars + T9 mirotech/", () => {
    const targets = browseListTargets({
      mediaRoot: "mirotech",
      pillar: "all",
      folderFilter: "web_full",
      source: "portfolio",
    });
    const site = targets.filter((t) => t.vault === "mirotech-site").map((t) => t.prefix);
    const brightline = targets.filter((t) => t.vault === "brightline").map((t) => t.prefix);
    expect(site).toEqual(["projects/", "journal/", "resume/", "site/"]);
    expect(brightline).toEqual([
      "portfolio/arc/",
      "portfolio/cam/",
      "portfolio/cor/",
      "mirotech/",
    ]);
  });

  it("Mirotech + product category lists site prefixes + portfolio pillars + mirotech/product/", () => {
    const targets = browseListTargets({
      mediaRoot: "mirotech",
      pillar: "product",
      folderFilter: "web_full",
      source: "portfolio",
    });
    expect(targets.some((t) => t.prefix === "mirotech/product/" && t.vault === "brightline")).toBe(
      true
    );
    expect(targets.some((t) => t.prefix === "portfolio/cor/" && t.vault === "brightline")).toBe(
      true
    );
    expect(targets.filter((t) => t.vault === "mirotech-site")).toHaveLength(4);
  });

  it("architecture pillar under Mirotech is coerced so list still hits mirotech/", () => {
    const targets = browseListTargets({
      mediaRoot: "mirotech",
      pillar: "architecture",
      folderFilter: "web_full",
      source: "portfolio",
    });
    expect(targets.some((t) => t.prefix === "mirotech/" && t.vault === "brightline")).toBe(true);
    expect(targets.every((t) => !t.prefix.includes("architecture"))).toBe(true);
  });

  it("folder filter applies to T9 and portfolio keys only, not CMS bucket", () => {
    const picks: R2BrowserPick[] = [
      { key: "projects/foo/hero.webp", vault: "mirotech-site" },
      { key: "mirotech/product/web_full/a.webp", vault: "brightline" },
      { key: "mirotech/arc/web_full/legacy.webp", vault: "brightline" },
      { key: "mirotech/product/web_thumb/b.webp", vault: "brightline" },
      { key: "portfolio/cor/web_full/cor-260812-11.webp", vault: "brightline" },
      { key: "portfolio/cor/web_thumb/cor-260812-11.webp", vault: "brightline" },
    ];
    const filtered = filterBrowsePicks(picks, "web_full", "mirotech");
    expect(filtered.map((p) => p.key)).toEqual([
      "projects/foo/hero.webp",
      "mirotech/product/web_full/a.webp",
      "mirotech/arc/web_full/legacy.webp",
      "portfolio/cor/web_full/cor-260812-11.webp",
    ]);
  });

  it("matchesT9FolderFilter includes legacy mirotech/arc and portfolio paths", () => {
    expect(matchesT9FolderFilter("mirotech/arc/web_full/x.webp", "web_full")).toBe(true);
    expect(matchesT9FolderFilter("portfolio/cor/web_full/cor-01.webp", "web_full")).toBe(true);
    expect(matchesT9FolderFilter("mirotech/product/web_thumb/x.webp", "web_full")).toBe(false);
  });

  it("Brightline portfolio still uses classic T9 prefixes", () => {
    const targets = browseListTargets({
      mediaRoot: "portfolio",
      pillar: "architecture",
      folderFilter: "web_full",
      source: "portfolio",
    });
    expect(targets).toEqual([{ prefix: "portfolio/arc/web_full/", vault: "brightline" }]);
  });
});
