import { describe, expect, it } from "vitest";
import { safeJsonLdScript } from "@/lib/safe-json-ld";
import { safeExternalMapsHref } from "@/lib/travel-map-coords";

describe("safeJsonLdScript", () => {
  it("escapes script breakout sequences", () => {
    const html = safeJsonLdScript({ title: "</script><script>alert(1)</script>" });
    expect(html).not.toContain("</script>");
    expect(html).toContain("\\u003c/script\\u003e");
  });
});

describe("safeExternalMapsHref", () => {
  it("allows Google Maps https links", () => {
    expect(
      safeExternalMapsHref("https://maps.app.goo.gl/abc")
    ).toBe("https://maps.app.goo.gl/abc");
  });

  it("rejects javascript and non-Google hosts", () => {
    expect(safeExternalMapsHref("javascript:alert(1)")).toBe("");
    expect(safeExternalMapsHref("https://evil.example/phish")).toBe("");
  });
});
