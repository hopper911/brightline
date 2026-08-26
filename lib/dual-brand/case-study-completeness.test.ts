import { describe, expect, it } from "vitest";
import {
  CASE_STUDY_TEMPLATES,
  seedCaseStudySections,
} from "@/lib/dual-brand/case-study-template";
import {
  MIN_BODY_CHARS,
  scoreCaseStudyCompleteness,
  shellForChecklistItem,
} from "@/lib/dual-brand/case-study-completeness";

const LONG = "A".repeat(MIN_BODY_CHARS);

describe("case-study-completeness", () => {
  it("maps every checklist label for all three modes", () => {
    for (const template of CASE_STUDY_TEMPLATES) {
      const report = scoreCaseStudyCompleteness(template.id, [], {});
      const labels = template.checklist.flatMap((g) => g.items);
      expect(report.totalCount).toBe(labels.length);
      expect(report.items.map((i) => i.item)).toEqual(labels);
      expect(report.items.every((i) => i.reason !== "No completeness rule mapped.")).toBe(true);
    }
  });

  it("marks empty seeded product_ux draft as missing", () => {
    const sections = seedCaseStudySections("product_ux");
    const report = scoreCaseStudyCompleteness("product_ux", sections, {});
    expect(report.doneCount).toBe(0);
    expect(report.totalCount).toBeGreaterThan(10);
    const gallery = report.items.find((i) => i.item === "Primary journey or service blueprint");
    expect(gallery?.status).toBe("missing");
    expect(gallery?.reason).toMatch(/gallery/i);
  });

  it("requires prototype URL and a prototype section", () => {
    const sections = seedCaseStudySections("product_ux");
    const url = "https://ops.example.com";
    const noSection = scoreCaseStudyCompleteness("product_ux", sections, { prototypeUrl: url });
    const proto = noSection.items.find((i) => i.item === "Clickable prototype");
    expect(proto?.status).toBe("missing");
    expect(proto?.reason).toMatch(/Insert a Live prototype/i);

    const withBlock = scoreCaseStudyCompleteness(
      "product_ux",
      [...sections, { type: "prototype", title: "Live prototype", body: "", data: {} }],
      { prototypeUrl: url }
    );
    expect(withBlock.items.find((i) => i.item === "Clickable prototype")?.status).toBe("done");

    const noUrl = scoreCaseStudyCompleteness(
      "product_ux",
      [...sections, { type: "prototype", title: "Live prototype", body: "", data: {} }],
      { prototypeUrl: "" }
    );
    expect(noUrl.items.find((i) => i.item === "Clickable prototype")?.status).toBe("missing");
  });

  it("marks gallery items done only when images exist", () => {
    const sections = seedCaseStudySections("product_ux").map((s) =>
      s.title === "Journey and concepts"
        ? { ...s, data: { images: [{ src: "portfolio/cor/web_full/a.webp" }] } }
        : s
    );
    const report = scoreCaseStudyCompleteness("product_ux", sections, {});
    expect(report.items.find((i) => i.item === "Primary journey or service blueprint")?.status).toBe(
      "done"
    );
    expect(report.items.find((i) => i.item === "Competing concepts")?.status).toBe("done");
    expect(report.items.find((i) => i.item === "Responsive layouts")?.status).toBe("missing");
  });

  it("marks body items done when the linked section is long enough", () => {
    const sections = seedCaseStudySections("basic").map((s) =>
      s.title === "Challenge" ? { ...s, body: LONG } : s
    );
    const report = scoreCaseStudyCompleteness("basic", sections, {});
    expect(report.items.find((i) => i.item === "Challenge and context")?.status).toBe("done");
    expect(report.items.find((i) => i.item === "Approach in brief")?.status).toBe("missing");
  });

  it("treats disclaimer or sample language as sample-data complete", () => {
    const sections = seedCaseStudySections("basic");
    const viaField = scoreCaseStudyCompleteness("basic", sections, {
      projectDisclaimer: "Self-initiated concept / sample data — not a third-party commission.",
    });
    expect(viaField.items.find((i) => i.item === "Realistic / labeled sample data")?.status).toBe(
      "done"
    );
    const viaBody = scoreCaseStudyCompleteness(
      "basic",
      sections.map((s) =>
        s.title === "Overview and role" ? { ...s, body: `${LONG} Uses sample data only.` } : s
      ),
      {}
    );
    expect(viaBody.items.find((i) => i.item === "No fabricated claims")?.status).toBe("done");
  });

  it("marks hero / opening visual from Project core", () => {
    const report = scoreCaseStudyCompleteness("visual_ui", seedCaseStudySections("visual_ui"), {
      heroImage: "portfolio/cor/web_full/hero.webp",
    });
    expect(report.items.find((i) => i.item === "Strong opening visual")?.status).toBe("done");
  });

  it("builds a shell for a missing section or prototype", () => {
    const report = scoreCaseStudyCompleteness("product_ux", [], {});
    const problem = report.items.find((i) => i.item === "One-sentence product problem")!;
    const shell = shellForChecklistItem("product_ux", problem);
    expect(shell?.title).toBe("Problem and users");
    expect(shell?.type).toBe("text");
    const proto = report.items.find((i) => i.item === "Clickable prototype")!;
    expect(shellForChecklistItem("product_ux", proto)?.type).toBe("prototype");
  });
});
