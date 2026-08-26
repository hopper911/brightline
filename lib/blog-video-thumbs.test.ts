import { describe, expect, it } from "vitest";
import { youtubeThumbnailUrl, youtubeThumbnailCandidates } from "@/lib/blog-video-thumbs-client";

describe("youtubeThumbnailUrl", () => {
  it("builds i.ytimg URLs", () => {
    expect(youtubeThumbnailUrl("oXKK7l3-DVc")).toBe(
      "https://i.ytimg.com/vi/oXKK7l3-DVc/hqdefault.jpg"
    );
    expect(youtubeThumbnailCandidates("oXKK7l3-DVc")[0]).toContain("maxresdefault");
  });
});
