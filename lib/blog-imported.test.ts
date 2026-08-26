import { describe, expect, it } from "vitest";
import { normalizeImportedBlogBody } from "@/lib/blog-imported";

describe("normalizeImportedBlogBody", () => {
  it("removes standalone ampersand blocks and shouty headers", () => {
    const input = "OVERVIEW\n\nHello world.\n\n&\n\nINTRODUCTION\n\nMore text.";
    const out = normalizeImportedBlogBody(input);
    expect(out).toContain("Overview");
    expect(out).toContain("Introduction");
    expect(out).not.toContain("&");
    expect(out).not.toContain("OVERVIEW");
  });
});
