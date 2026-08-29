import { describe, expect, it } from "vitest";
import {
  preferPortfolioWebFullKey,
  preferPortfolioWebThumbKey,
} from "@/lib/portfolio-web-full";

describe("portfolio web_full / web_thumb key helpers", () => {
  it("upgrades thumb to full for bleed delivery", () => {
    expect(preferPortfolioWebFullKey("portfolio/arc/web_thumb/hero.webp")).toBe(
      "portfolio/arc/web_full/hero.webp"
    );
  });

  it("downgrades full to thumb for card delivery", () => {
    expect(preferPortfolioWebThumbKey("portfolio/arc/web_full/hero.webp")).toBe(
      "portfolio/arc/web_thumb/hero.webp"
    );
  });

  it("preserves video keys", () => {
    const video = "portfolio/arc/web_video/clip.mp4";
    expect(preferPortfolioWebThumbKey(video)).toBe(video);
    expect(preferPortfolioWebFullKey(video)).toBe(video);
  });
});
