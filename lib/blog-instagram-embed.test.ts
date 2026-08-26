import { describe, expect, it } from "vitest";
import {
  blankCaseStudy,
  cleanBlogPostVideo,
  cleanVideoPosterUrl,
  extractInstagramPermalink,
  extractYouTubeId,
  getCaseStudyVideoProvider,
  instagramEmbedUrl,
  type BlogCaseStudySections,
} from "@/lib/blog-post-model";

describe("extractInstagramPermalink", () => {
  it("normalizes reel, post, and tv URLs", () => {
    expect(
      extractInstagramPermalink("https://www.instagram.com/reel/AbC123_xy/")
    ).toBe("https://www.instagram.com/reel/AbC123_xy/");
    expect(
      extractInstagramPermalink(
        "https://instagram.com/p/PostCode99/?utm_source=ig_web_copy_link"
      )
    ).toBe("https://www.instagram.com/p/PostCode99/");
    expect(
      extractInstagramPermalink("https://www.instagram.com/tv/TvCode01")
    ).toBe("https://www.instagram.com/tv/TvCode01/");
    expect(
      extractInstagramPermalink("www.instagram.com/reels/ReelCode2/")
    ).toBe("https://www.instagram.com/reel/ReelCode2/");
  });

  it("rejects non-Instagram hosts and invalid paths", () => {
    expect(extractInstagramPermalink("https://evil.com/reel/AbC123/")).toBeNull();
    expect(extractInstagramPermalink("https://www.instagram.com/user/")).toBeNull();
    expect(extractInstagramPermalink("")).toBeNull();
    expect(extractInstagramPermalink("not a url")).toBeNull();
  });

  it("builds embed iframe URLs", () => {
    expect(instagramEmbedUrl("https://www.instagram.com/reel/AbC123_xy/")).toBe(
      "https://www.instagram.com/reel/AbC123_xy/embed/"
    );
    expect(instagramEmbedUrl("https://evil.com/reel/AbC/")).toBeNull();
  });
});

describe("cleanVideoPosterUrl", () => {
  it("allows R2 keys, site paths, and trusted hosts", () => {
    expect(cleanVideoPosterUrl("site/blog/x/poster.jpg")).toBe("site/blog/x/poster.jpg");
    expect(cleanVideoPosterUrl("/api/media/public?key=site%2Fa.jpg")).toContain(
      "/api/media/public"
    );
    expect(cleanVideoPosterUrl("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg")).toContain(
      "i.ytimg.com"
    );
  });

  it("rejects arbitrary external posters and traversal", () => {
    expect(cleanVideoPosterUrl("https://evil.com/track.png")).toBe("");
    expect(cleanVideoPosterUrl("../etc/passwd")).toBe("");
  });

  it("strips bad posters when cleaning videos", () => {
    const cleaned = cleanBlogPostVideo({
      id: "vid_1",
      provider: "youtube",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      posterUrl: "https://evil.com/x.jpg",
      caption: "ok",
    });
    expect(cleaned?.posterUrl).toBe("");
    expect(extractYouTubeId(cleaned!.url)).toBe("dQw4w9WgXcQ");
  });
});

describe("getCaseStudyVideoProvider precedence", () => {
  function cs(partial: Partial<BlogCaseStudySections>): BlogCaseStudySections {
    return { ...blankCaseStudy(), videoEnabled: true, ...partial };
  }

  it("prefers AI over Instagram over YouTube", () => {
    expect(
      getCaseStudyVideoProvider(
        cs({
          aiVideoStatus: "ready",
          aiVideoKey: "site/blog/x/ai.mp4",
          videoUrl: "https://www.instagram.com/reel/AbC123/",
        })
      )
    ).toBe("ai");

    expect(
      getCaseStudyVideoProvider(
        cs({
          videoUrl: "https://www.instagram.com/reel/AbC123/",
        })
      )
    ).toBe("instagram");

    expect(
      getCaseStudyVideoProvider(
        cs({
          videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        })
      )
    ).toBe("youtube");

    expect(extractYouTubeId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(
      getCaseStudyVideoProvider(
        cs({ videoEnabled: false, videoUrl: "https://www.instagram.com/reel/AbC/" })
      )
    ).toBeNull();
  });
});
