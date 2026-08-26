import { describe, expect, it } from "vitest";
import {
  defaultSegmentForRoot,
  isLegacyMirotechPillar,
  isValidSegment,
  segmentsForRoot,
} from "./t9-media-segments";

describe("t9-media-segments", () => {
  it("returns Brightline pillars for portfolio root", () => {
    const opts = segmentsForRoot("portfolio");
    expect(opts.map((o) => o.id)).toEqual(["arc", "cam", "cor"]);
    expect(defaultSegmentForRoot("portfolio")).toBe("arc");
  });

  it("returns Mirotech work categories for mirotech root", () => {
    const opts = segmentsForRoot("mirotech");
    expect(opts.map((o) => o.id)).toEqual([
      "product",
      "editorial",
      "brand",
      "service",
      "research",
      "motion",
    ]);
    expect(defaultSegmentForRoot("mirotech")).toBe("product");
  });

  it("validates segments per root", () => {
    expect(isValidSegment("portfolio", "arc")).toBe(true);
    expect(isValidSegment("portfolio", "product")).toBe(false);
    expect(isValidSegment("mirotech", "product")).toBe(true);
    expect(isValidSegment("mirotech", "arc")).toBe(false);
  });

  it("flags legacy mirotech pillars", () => {
    expect(isLegacyMirotechPillar("cor")).toBe(true);
    expect(isLegacyMirotechPillar("product")).toBe(false);
  });
});
