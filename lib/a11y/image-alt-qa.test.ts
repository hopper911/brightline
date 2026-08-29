import { describe, expect, it } from "vitest";
import { countImagesMissingAlt, imagesMissingAltMessage } from "./image-alt-qa";

describe("image-alt-qa", () => {
  it("counts images without trimmed alt", () => {
    expect(
      countImagesMissingAlt([
        { alt: "Lobby at dusk" },
        { alt: "" },
        { alt: null },
        { alt: "   " },
      ])
    ).toBe(3);
  });

  it("formats missing-alt warning", () => {
    expect(imagesMissingAltMessage(2)).toContain("2 images missing alt text");
    expect(imagesMissingAltMessage(1)).toContain("1 image missing");
    expect(imagesMissingAltMessage(0)).toBe("");
  });
});
