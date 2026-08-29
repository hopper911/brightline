import { describe, expect, it } from "vitest";
import {
  buildMirotechTemplateSectionPayload,
  getMirotechCaseStudyTemplateDef,
  LEGACY_MIROTECH_TEMPLATE_ID_MAP,
  listMirotechCaseStudyTemplateDefs,
  MIROTECH_CASE_STUDY_TEMPLATE_DEFS,
} from "@/lib/platform/projects/mirotech-template-definitions";

describe("mirotech case study template definitions", () => {
  it("defines exactly five portfolio-aligned templates", () => {
    expect(MIROTECH_CASE_STUDY_TEMPLATE_DEFS.length).toBe(5);
    const ids = MIROTECH_CASE_STUDY_TEMPLATE_DEFS.map((t) => t.id);
    expect(ids).toEqual([
      "ai-saas-platform",
      "ai-automation-agent-workflow",
      "data-intelligence-platform",
      "fintech-compliance-platform",
      "operational-workflow-saas",
    ]);
  });

  it("does not seed fabricated section body copy", () => {
    for (const def of MIROTECH_CASE_STUDY_TEMPLATE_DEFS) {
      const sections = buildMirotechTemplateSectionPayload(def);
      expect(sections.length).toBeGreaterThan(0);
      for (const section of sections) {
        expect(section.body).toBe("");
      }
    }
  });

  it("maps legacy Phase 22A template ids", () => {
    expect(getMirotechCaseStudyTemplateDef("ai-saas-case-study")?.id).toBe("ai-saas-platform");
    expect(LEGACY_MIROTECH_TEMPLATE_ID_MAP["data-platform"]).toBe("data-intelligence-platform");
  });

  it("each template includes structure metadata", () => {
    for (const def of listMirotechCaseStudyTemplateDefs()) {
      expect(def.coreFields.some((f) => f.key === "summary" && f.required)).toBe(true);
      expect(def.mediaSlots.some((m) => m.key === "heroImage" && m.required)).toBe(true);
      expect(def.seo.titlePattern).toContain("{Project title}");
      expect(def.technologyCategories.length).toBeGreaterThan(0);
      expect(def.aiDraft.enabled).toBe(true);
    }
  });
});
