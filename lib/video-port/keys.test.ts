import { describe, expect, it } from "vitest";
import {
  formatVideoStem,
  isAcceptedVideoFile,
  isVideoPortPillar,
  isVideoPortTempKey,
  isVideoPortVideoKey,
  maxVideoSeqFromKeys,
  normalizePortfolioVideoKey,
  videoPortKeysForStem,
  yyMmDdUtc,
} from "./keys";

describe("video-port keys", () => {
  it("accepts pillars and rejects others", () => {
    expect(isVideoPortPillar("arc")).toBe(true);
    expect(isVideoPortPillar("cam")).toBe(true);
    expect(isVideoPortPillar("cor")).toBe(true);
    expect(isVideoPortPillar("adv")).toBe(false);
  });

  it("guards temp keys", () => {
    expect(isVideoPortTempKey("tmp/video-port/.parts/abc/00001")).toBe(true);
    expect(isVideoPortTempKey("tmp/video-port/../evil")).toBe(false);
    expect(isVideoPortTempKey("portfolio/arc/web_video/x.mp4")).toBe(false);
  });

  it("builds stem keys and parses max seq", () => {
    const yymmdd = "260825";
    const stem = formatVideoStem("arc", yymmdd, 3);
    expect(stem).toBe("arc-260825-03");
    const keys = videoPortKeysForStem("arc", stem);
    expect(keys.videoKey).toBe("portfolio/arc/web_video/arc-260825-03.mp4");
    expect(keys.posterKey).toBe("portfolio/arc/web_video/arc-260825-03-poster.webp");
    expect(isVideoPortVideoKey(keys.videoKey)).toBe(true);

    const miro = videoPortKeysForStem("product", "product-260826-01", "mirotech");
    expect(miro.videoKey).toBe("mirotech/product/web_video/product-260826-01.mp4");
    expect(isVideoPortVideoKey(miro.videoKey)).toBe(true);
    expect(isVideoPortVideoKey("mirotech/cor/web_video/cor-260826-01.mp4")).toBe(true);

    expect(
      maxVideoSeqFromKeys(
        [
          "portfolio/arc/web_video/arc-260825-01.mp4",
          "portfolio/arc/web_video/arc-260825-02-poster.webp",
          "portfolio/arc/web_video/arc-260825-04.mp4",
        ],
        "arc",
        yymmdd
      )
    ).toBe(4);
  });

  it("accepts common video filenames", () => {
    expect(isAcceptedVideoFile({ name: "clip.mp4", type: "video/mp4" })).toBe(true);
    expect(isAcceptedVideoFile({ name: "clip.MOV", type: "" })).toBe(true);
    expect(isAcceptedVideoFile({ name: "clip.mov", type: "application/octet-stream" })).toBe(true);
    expect(isAcceptedVideoFile({ name: "reel", type: "video/quicktime" })).toBe(true);
    expect(isAcceptedVideoFile({ name: "photo.jpg", type: "image/jpeg" })).toBe(false);
  });

  it("normalizes incomplete web_video keys", () => {
    expect(normalizePortfolioVideoKey("portfolio/arc/web_video/arc-260825-01")).toBe(
      "portfolio/arc/web_video/arc-260825-01.mp4"
    );
    expect(normalizePortfolioVideoKey("portfolio/arc/web_video/arc-260825-01.mp4")).toBe(
      "portfolio/arc/web_video/arc-260825-01.mp4"
    );
    expect(normalizePortfolioVideoKey("portfolio/arc/web_video/arc-260825-01-poster")).toBe(
      "portfolio/arc/web_video/arc-260825-01-poster.webp"
    );
    expect(normalizePortfolioVideoKey("mirotech/product/web_video/product-260826-01")).toBe(
      "mirotech/product/web_video/product-260826-01.mp4"
    );
    expect(normalizePortfolioVideoKey("mirotech/cor/web_video/cor-260826-01")).toBe(
      "mirotech/cor/web_video/cor-260826-01.mp4"
    );
    expect(
      normalizePortfolioVideoKey("/api/media/public?key=portfolio%2Farc%2Fweb_video%2Farc-260825-01")
    ).toContain("arc-260825-01.mp4");
  });

  it("strips illegal stem characters that break playback", () => {
    expect(normalizePortfolioVideoKey("portfolio/cor/web_video/cor-260826-0:")).toBe(
      "portfolio/cor/web_video/cor-260826-0.mp4"
    );
    expect(normalizePortfolioVideoKey("portfolio/cor/web_video/cor-260826-01:.mp4")).toBe(
      "portfolio/cor/web_video/cor-260826-01.mp4"
    );
  });

  it("yyMmDdUtc is 6 digits", () => {
    expect(yyMmDdUtc(new Date("2026-08-25T12:00:00Z"))).toBe("260825");
  });
});
