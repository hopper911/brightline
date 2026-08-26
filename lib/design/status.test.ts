import { describe, expect, it } from "vitest";
import {
  designPortfolioStatusLabel,
  normalizeDesignPortfolioStatus,
  isDesignPortfolioStatus,
} from "@/lib/design/status";
import { filterProjectsByCategory, normalizeDesignDisciplinesExpanded } from "@/lib/design/categories";
import { normalizeCaseStudy, scrubPublicCaseStudyText } from "@/lib/design/case-study";
import { normalizeResumePageSettings } from "@/lib/feature-flags";

describe("design portfolio status", () => {
  it("maps known statuses", () => {
    expect(designPortfolioStatusLabel("INTERNAL_TOOL")).toBe("Internal Tool");
    expect(isDesignPortfolioStatus("LIVE_PRODUCT")).toBe(true);
    expect(isDesignPortfolioStatus("NOPE")).toBe(false);
    expect(normalizeDesignPortfolioStatus("bogus")).toBe("PRODUCT_CONCEPT");
  });
});

describe("design categories", () => {
  it("filters and normalizes", () => {
    const projects = [
      { disciplines: ["product", "ux-ui"] },
      { disciplines: ["graphic"] },
    ];
    expect(filterProjectsByCategory(projects, "product")).toHaveLength(1);
    expect(normalizeDesignDisciplinesExpanded(["Product", "ux-ui", "nope"])).toEqual([
      "product",
      "ux-ui",
    ]);
    expect(normalizeDesignDisciplinesExpanded(["product", "web"])).toEqual(["product", "web"]);
  });
});

describe("case study scrubbing", () => {
  it("removes TODO lines from public text", () => {
    expect(scrubPublicCaseStudyText("Hello\nTODO: secret\nWorld")).toBe("Hello\nWorld");
    expect(normalizeCaseStudy({ overview: "Ship it [TODO: metrics]" }).overview).toBe("Ship it");
  });
});

describe("resume page settings", () => {
  it("defaults disabled", () => {
    expect(normalizeResumePageSettings({}).enabled).toBe(false);
    expect(normalizeResumePageSettings({ enabled: true, linkedinUrl: "https://linkedin.com/in/x" }).linkedinUrl).toContain(
      "linkedin.com"
    );
  });
});
