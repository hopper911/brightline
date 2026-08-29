import { describe, expect, it } from "vitest";
import {
  categorizeMissingBlockers,
  friendlyBlockerLabel,
  friendlyMissingList,
} from "@/lib/studio/projects/completion-blockers";

describe("completion blockers", () => {
  it("maps missing labels to categories", () => {
    const blockers = categorizeMissingBlockers([
      "project summary",
      "hero asset",
      "SEO title",
      "template section: Product walkthrough",
    ]);
    expect(blockers.content).toContain("summary");
    expect(blockers.media).toContain("final hero image");
    expect(blockers.seo).toContain("SEO title");
    expect(blockers.content.some((c) => c.startsWith("section:"))).toBe(true);
  });

  it("friendly labels humanize raw keys", () => {
    expect(friendlyBlockerLabel("hero asset")).toBe("final hero image");
    expect(friendlyMissingList(["hero asset", "seo title"])).toEqual([
      "final hero image",
      "SEO title",
    ]);
  });
});
