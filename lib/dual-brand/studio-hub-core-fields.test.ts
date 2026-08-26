import { describe, expect, it } from "vitest";
import { normalizeCoreFieldKey } from "@/lib/dual-brand/studio-hub-core-fields";

describe("normalizeCoreFieldKey", () => {
  it("accepts camelCase keys verbatim", () => {
    expect(normalizeCoreFieldKey("projectDisclaimer")).toBe("projectDisclaimer");
    expect(normalizeCoreFieldKey("whatsNext")).toBe("whatsNext");
  });

  it("matches camelCase keys case-insensitively", () => {
    expect(normalizeCoreFieldKey("projectdisclaimer")).toBe("projectDisclaimer");
    expect(normalizeCoreFieldKey("WHATSNEXT")).toBe("whatsNext");
    expect(normalizeCoreFieldKey("  Challenge  ")).toBe("challenge");
  });

  it("rejects unknown keys", () => {
    expect(normalizeCoreFieldKey("brief")).toBeNull();
    expect(normalizeCoreFieldKey("")).toBeNull();
  });
});
