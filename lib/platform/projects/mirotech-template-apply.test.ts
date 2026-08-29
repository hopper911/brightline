import { describe, expect, it } from "vitest";
import { validateMirotechProjectCompleteness } from "@/lib/platform/projects/completeness/mirotech-case-study";
import {
  buildMirotechCreatePayloadFromTemplate,
  validateMirotechCaseStudyAgainstTemplate,
} from "@/lib/platform/projects/mirotech-template-apply";
import { getMirotechCaseStudyTemplateDef } from "@/lib/platform/projects/mirotech-template-definitions";

describe("mirotech template apply and validation", () => {
  const def = getMirotechCaseStudyTemplateDef("ai-saas-platform");
  if (!def) throw new Error("template missing");

  it("builds create payload with empty section shells", () => {
    const payload = buildMirotechCreatePayloadFromTemplate(def, {
      title: "Test",
      slug: "test",
      status: "DRAFT",
    });
    expect(Array.isArray(payload.sections)).toBe(true);
    expect((payload.sections as Array<{ body: string }>).every((s) => s.body === "")).toBe(true);
    expect(payload.categories).toEqual(["AI", "SaaS"]);
  });

  it("validates missing template sections after create", () => {
    const result = validateMirotechCaseStudyAgainstTemplate("ai-saas-platform", {
      title: "T",
      slug: "t",
      summary: "Summary",
      status: "DRAFT",
      heroImage: null,
      thumbnailImage: null,
      sectionCount: 0,
      challenge: "c",
      outcome: "o",
      role: "Lead",
      seoTitle: null,
      seoDescription: null,
      publishMirotech: true,
      sectionTitles: ["Overview and role"],
    });
    expect(result?.passed).toBe(false);
    expect(result?.missingSections.length).toBeGreaterThan(0);
  });

  it("adds template section gaps to completeness when templateId is set", () => {
    const completeness = validateMirotechProjectCompleteness({
      title: "T",
      slug: "t",
      summary: "Summary",
      status: "DRAFT",
      heroImage: "hero.jpg",
      thumbnailImage: null,
      sectionCount: 1,
      challenge: "c",
      outcome: "o",
      role: "Lead",
      seoTitle: "SEO",
      seoDescription: "Desc",
      publishMirotech: true,
      templateId: "ai-saas-platform",
      sectionTitles: ["Overview and role"],
    });
    expect(completeness.missing.some((m) => m.startsWith("template section:"))).toBe(true);
    expect(completeness.complete).toBe(false);
  });
});
