import { describe, expect, it } from "vitest";
import {
  defaultUploadDestination,
  formatUploadDestinationLabel,
  normalizeUploadDestination,
  parseUploadDestinationFromSearch,
  resolveUploadPrefix,
} from "./r2-upload-destination";

describe("r2-upload-destination", () => {
  it("defaults to Brightline portfolio arc web_full", () => {
    expect(defaultUploadDestination()).toEqual({
      root: "portfolio",
      segment: "arc",
      quality: "web_full",
    });
    expect(defaultUploadDestination("video").quality).toBe("web_video");
  });

  it("resolves sibling prefixes", () => {
    expect(
      resolveUploadPrefix({ root: "portfolio", segment: "cam", quality: "web_full" })
    ).toBe("portfolio/cam/web_full/");
    expect(
      resolveUploadPrefix({ root: "mirotech", segment: "product", quality: "web_video" })
    ).toBe("mirotech/product/web_video/");
  });

  it("normalizes invalid segment to root default", () => {
    expect(
      normalizeUploadDestination({ root: "portfolio", segment: "nope", quality: "web_full" })
    ).toEqual({ root: "portfolio", segment: "arc", quality: "web_full" });
    expect(
      normalizeUploadDestination({ root: "mirotech", segment: "arc", quality: "web_full" }).segment
    ).toBe("product");
  });

  it("forces video quality to web_video and image away from web_video", () => {
    expect(
      normalizeUploadDestination(
        { root: "portfolio", segment: "arc", quality: "web_full" },
        "video"
      ).quality
    ).toBe("web_video");
    expect(
      normalizeUploadDestination(
        { root: "portfolio", segment: "arc", quality: "web_video" },
        "image"
      ).quality
    ).toBe("web_full");
  });

  it("formats human labels", () => {
    expect(
      formatUploadDestinationLabel({ root: "portfolio", segment: "cor", quality: "web_full" })
    ).toContain("Brightline");
    expect(
      formatUploadDestinationLabel({ root: "mirotech", segment: "motion", quality: "web_video" })
    ).toContain("Mirotech T9");
  });

  it("parses search params including legacy pillar", () => {
    expect(parseUploadDestinationFromSearch({ root: "mirotech", pillar: "brand", quality: "web_full" })).toEqual({
      root: "mirotech",
      segment: "brand",
      quality: "web_full",
    });
  });
});
