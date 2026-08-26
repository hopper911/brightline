import { describe, expect, it } from "vitest";
import {
  blankCaseStudy,
  cleanSectionOrder,
  migrateLegacyCaseStudyVideos,
  hasBlogVideos,
  TRAVEL_SECTION_ORDER,
} from "@/lib/blog-post-model";

describe("multi-video migration", () => {
  it("migrates legacy YouTube and Instagram into videos[]", () => {
    const cs = blankCaseStudy();
    cs.videoEnabled = true;
    cs.videoUrl = "https://www.instagram.com/reel/AbC123_xy/";
    const vids = migrateLegacyCaseStudyVideos(cs, []);
    expect(vids).toHaveLength(1);
    expect(vids[0]?.provider).toBe("instagram");
    expect(hasBlogVideos(vids)).toBe(true);
  });

  it("keeps existing videos array over legacy", () => {
    const cs = blankCaseStudy();
    cs.videoEnabled = true;
    cs.videoUrl = "https://youtu.be/oXKK7l3-DVc";
    const existing = [
      {
        id: "vid_1",
        provider: "youtube",
        url: "https://youtu.be/AAAAAAAAAAA",
        r2Key: "",
        posterUrl: "",
        caption: "first",
      },
    ];
    const vids = migrateLegacyCaseStudyVideos(cs, existing);
    expect(vids).toHaveLength(1);
    expect(vids[0]?.url).toContain("AAAAAAAAAAA");
  });
});

describe("section order", () => {
  it("appends missing travel sections after custom prefix", () => {
    const order = cleanSectionOrder(["videos", "body"], "travel");
    expect(order[0]).toBe("videos");
    expect(order[1]).toBe("body");
    expect(order).toEqual(
      expect.arrayContaining(TRAVEL_SECTION_ORDER)
    );
    expect(order.length).toBe(TRAVEL_SECTION_ORDER.length);
  });
});
