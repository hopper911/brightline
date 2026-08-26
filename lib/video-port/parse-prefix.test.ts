import { describe, expect, it } from "vitest";
import { pairKeyCandidate } from "@/lib/admin-r2-manager";
import {
  isT9WebVideoPrefix,
  parseT9WebVideoPrefix,
} from "@/lib/video-port/parse-prefix";

describe("parseT9WebVideoPrefix", () => {
  it("parses Brightline web_video folder prefixes", () => {
    expect(parseT9WebVideoPrefix("portfolio/arc/web_video/")).toEqual({
      root: "portfolio",
      segment: "arc",
    });
  });

  it("parses Mirotech category web_video prefixes", () => {
    expect(parseT9WebVideoPrefix("mirotech/product/web_video/")).toEqual({
      root: "mirotech",
      segment: "product",
    });
    expect(parseT9WebVideoPrefix("mirotech/editorial/web_video")).toEqual({
      root: "mirotech",
      segment: "editorial",
    });
  });

  it("still parses legacy mirotech pillar paths for browse", () => {
    expect(parseT9WebVideoPrefix("mirotech/cor/web_video")).toEqual({
      root: "mirotech",
      segment: "cor",
    });
  });

  it("detects T9 web_video destinations", () => {
    expect(isT9WebVideoPrefix("portfolio/cam/web_video/")).toBe(true);
    expect(isT9WebVideoPrefix("mirotech/product/web_video/")).toBe(true);
    expect(isT9WebVideoPrefix("portfolio/cam/web_full/")).toBe(false);
  });
});

describe("pairKeyCandidate video posters", () => {
  it("maps mp4 to poster webp and back", () => {
    const video = "portfolio/arc/web_video/arc-260826-01.mp4";
    const poster = "portfolio/arc/web_video/arc-260826-01-poster.webp";
    expect(pairKeyCandidate(video)).toBe(poster);
    expect(pairKeyCandidate(poster)).toBe(video);
  });

  it("maps Mirotech category video to poster", () => {
    const video = "mirotech/product/web_video/product-260826-01.mp4";
    const poster = "mirotech/product/web_video/product-260826-01-poster.webp";
    expect(pairKeyCandidate(video)).toBe(poster);
    expect(pairKeyCandidate(poster)).toBe(video);
  });
});
