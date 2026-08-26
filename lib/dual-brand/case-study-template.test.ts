import { describe, expect, it } from "vitest";
import {
  CASE_STUDY_CREDIBILITY_NOTES,
  CASE_STUDY_SECTION_TYPES,
  CASE_STUDY_TEMPLATES,
  DEFAULT_CASE_STUDY_MODE,
  FLAGSHIP_CASE_STUDY_TEMPLATE,
  VISUAL_UI_CASE_STUDY_TEMPLATE,
  caseStudyModeFromCategories,
  categoryForCaseStudyMode,
  checklistForCaseStudyMode,
  defaultToneForCaseStudyMode,
  extractPrototypeUrl,
  getCaseStudyTemplate,
  hintForCaseStudySection,
  isLivePrototypeUrl,
  labelForCaseStudyMode,
  mergePrototypeIntoPlatforms,
  normalizePrototypeUrl,
  prototypeDisplayHost,
  seedCaseStudySections,
  seedFlagshipCaseStudySections,
  syncCategoriesWithCaseStudyMode,
} from "./case-study-template";

const VISUAL_TITLES = [
  "Overview and role",
  "Business objective and audience",
  "Customer insight",
  "Creative strategy",
  "Concepts and iteration",
  "Photography and design system",
  "Responsive experience",
  "Cross-channel applications",
  "Accessibility and production decisions",
  "Target outcomes and reflection",
] as const;

const PRODUCT_TITLES = [
  "Overview and role",
  "Problem and users",
  "Research and synthesis",
  "Success criteria",
  "Journey and concepts",
  "Iteration and prototype",
  "Usability findings",
  "Execution quality",
  "Handoff notes",
  "Target outcomes and reflection",
] as const;

const BASIC_TITLES = [
  "Overview and role",
  "Challenge",
  "Approach",
  "Process",
  "Solution",
  "Outcome",
  "Reflection",
] as const;

describe("case-study-template registry", () => {
  it("registers at least three templates including basic", () => {
    expect(CASE_STUDY_TEMPLATES.length).toBeGreaterThanOrEqual(3);
    expect(CASE_STUDY_TEMPLATES.map((t) => t.id)).toEqual(
      expect.arrayContaining(["basic", "product_ux", "visual_ui"])
    );
    expect(CASE_STUDY_TEMPLATES[0]?.id).toBe("basic");
    expect(DEFAULT_CASE_STUDY_MODE).toBe("basic");
  });

  it("defines Basic with 7 sections and Product/Visual with 10", () => {
    expect(getCaseStudyTemplate("basic").sections).toHaveLength(7);
    expect(getCaseStudyTemplate("basic").sections.map((s) => s.title)).toEqual([...BASIC_TITLES]);
    expect(getCaseStudyTemplate("product_ux").sections.map((s) => s.title)).toEqual([
      ...PRODUCT_TITLES,
    ]);
    expect(getCaseStudyTemplate("visual_ui").sections.map((s) => s.title)).toEqual([
      ...VISUAL_TITLES,
    ]);
    expect(FLAGSHIP_CASE_STUDY_TEMPLATE).toBe(VISUAL_UI_CASE_STUDY_TEMPLATE);
  });

  it("seeds empty drafts for each mode", () => {
    const basic = seedCaseStudySections("basic");
    const visual = seedCaseStudySections("visual_ui");
    const product = seedCaseStudySections("product_ux");
    expect(basic.map((s) => s.title)).toEqual([...BASIC_TITLES]);
    expect(visual.map((s) => s.title)).toEqual([...VISUAL_TITLES]);
    expect(product.map((s) => s.title)).toEqual([...PRODUCT_TITLES]);
    expect(basic.every((s) => s.body === "" && s.hint)).toBe(true);
    expect(seedFlagshipCaseStudySections().map((s) => s.title)).toEqual([...VISUAL_TITLES]);
    expect(seedCaseStudySections().map((s) => s.title)).toEqual([...BASIC_TITLES]);
  });

  it("maps mode to category/label and back for all templates", () => {
    for (const template of CASE_STUDY_TEMPLATES) {
      expect(categoryForCaseStudyMode(template.id)).toBe(template.category);
      expect(labelForCaseStudyMode(template.id)).toBe(template.label);
      expect(caseStudyModeFromCategories([template.category])).toBe(template.id);
    }
    expect(caseStudyModeFromCategories([])).toBe("basic");
    expect(caseStudyModeFromCategories("Ops")).toBe("basic");
  });

  it("syncs categories when mode changes", () => {
    expect(syncCategoriesWithCaseStudyMode(["Ops", "Visual UI"], "product_ux")).toEqual([
      "Product UX",
      "Ops",
    ]);
    expect(syncCategoriesWithCaseStudyMode("Product UX, Brand", "basic")).toEqual([
      "Case study",
      "Brand",
    ]);
  });

  it("defaults AI tone and checklist by mode", () => {
    expect(defaultToneForCaseStudyMode("basic")).toBe("editorial");
    expect(defaultToneForCaseStudyMode("product_ux")).toBe("product");
    expect(defaultToneForCaseStudyMode("visual_ui")).toBe("editorial");
    expect(checklistForCaseStudyMode("basic").length).toBe(3);
    const productFlat = checklistForCaseStudyMode("product_ux")
      .flatMap((g) => g.items)
      .join(" ");
    expect(productFlat).toMatch(/journey/i);
    expect(productFlat).toMatch(/Developer annotations/i);
  });

  it("includes credibility notes for sample data and targets", () => {
    const joined = CASE_STUDY_CREDIBILITY_NOTES.join(" ");
    expect(joined).toMatch(/sample/i);
    expect(joined).toMatch(/target/i);
  });

  it("resolves authoring hints by mode", () => {
    expect(hintForCaseStudySection("Challenge", undefined, "basic")).toMatch(/problem/i);
    expect(hintForCaseStudySection("Journey and concepts", undefined, "product_ux")).toMatch(
      /blueprint/i
    );
    expect(hintForCaseStudySection("Creative strategy", undefined, "visual_ui")).toMatch(
      /proposition/i
    );
    expect(hintForCaseStudySection("Custom", "My hint")).toBe("My hint");
  });

  it("includes prototype and video as placeable case-study section types", () => {
    expect(CASE_STUDY_SECTION_TYPES).toContain("prototype");
    expect(CASE_STUDY_SECTION_TYPES).toContain("video");
  });

  it("extracts and merges prototype URLs in platforms", () => {
    expect(extractPrototypeUrl(["Web", "https://proto.example"])).toBe("https://proto.example");
    expect(mergePrototypeIntoPlatforms("Web, iOS", "https://proto.example")).toEqual([
      "https://proto.example",
      "Web",
      "iOS",
    ]);
    expect(mergePrototypeIntoPlatforms("Web", "proto.example.com/app")).toEqual([
      "https://proto.example.com/app",
      "Web",
    ]);
    expect(normalizePrototypeUrl("www.figma.com/proto/abc")).toBe(
      "https://www.figma.com/proto/abc"
    );
    expect(isLivePrototypeUrl("https://ops.mirotech.solutions")).toBe(true);
    expect(isLivePrototypeUrl("not a url")).toBe(false);
    expect(prototypeDisplayHost("https://www.figma.com/proto/abc")).toBe("figma.com");
  });
});
