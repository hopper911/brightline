import { describe, expect, it } from "vitest";
import { buildBlogAltContext } from "@/lib/blog-image-alt";

describe("buildBlogAltContext", () => {
  it("maps journal post fields to vision context", () => {
    const ctx = buildBlogAltContext({
      title: "Food Photography",
      excerpt: "Studio lighting for editorial food.",
      body: "",
      tags: ["food", "photography"],
    });
    expect(ctx.projectTitle).toBe("Food Photography");
    expect(ctx.whatWasPhotographed).toContain("Studio lighting");
    expect(ctx.visualApproach).toContain("food");
  });
});
