import { describe, expect, it } from "vitest";
import {
  isSectionCopyTone,
  normalizeSectionCopyTone,
  SECTION_COPY_TONES,
} from "@/lib/dual-brand/section-copy-tone";

describe("section-copy-tone", () => {
  it("includes personal tone", () => {
    expect(SECTION_COPY_TONES).toContain("personal");
  });

  it("normalizes unknown tones to fallback", () => {
    expect(normalizeSectionCopyTone("personal")).toBe("personal");
    expect(normalizeSectionCopyTone("nope", "technical")).toBe("technical");
  });

  it("validates section copy tones", () => {
    expect(isSectionCopyTone("technical")).toBe(true);
    expect(isSectionCopyTone("personal")).toBe(true);
    expect(isSectionCopyTone("Quiet luxury")).toBe(false);
  });
});
