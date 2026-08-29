import { describe, expect, it } from "vitest";
import { validateStudioProjectSectionSave, seoLengthHints } from "@/lib/studio/projects/validate-studio-project-section";

describe("validateStudioProjectSectionSave", () => {
  const ref = { tenant: "brightline" as const, type: "work-project" as const, id: "p1" };

  it("requires title on overview", () => {
    expect(() => validateStudioProjectSectionSave(ref, "overview", { title: "" })).toThrow();
    const data = validateStudioProjectSectionSave(ref, "overview", {
      title: "Tower",
      slug: "tower",
      summary: "Short",
    });
    expect(data.title).toBe("Tower");
  });

  it("blocks publish when not complete", () => {
    expect(() =>
      validateStudioProjectSectionSave(ref, "publishing", {
        published: true,
        completenessComplete: false,
      })
    ).toThrow();
  });

  it("provides seo length hints", () => {
    const hints = seoLengthHints("Brightline Architecture Case Study", "A short description.");
    expect(hints.titleLen).toBeGreaterThan(0);
    expect(hints.descOk).toBe(true);
  });
});
