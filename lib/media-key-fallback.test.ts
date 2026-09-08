import { describe, expect, it } from "vitest";
import { publicMediaKeyFallbacks } from "./media-key-fallback";

describe("publicMediaKeyFallbacks", () => {
  it("offers web_full when a card thumb is missing", () => {
    expect(publicMediaKeyFallbacks("portfolio/arc/web_thumb/hero.webp")).toEqual([
      "portfolio/arc/web_full/hero.webp",
    ]);
    expect(publicMediaKeyFallbacks("mirotech/portfolio/cor/web_thumb/cor-01.webp")).toEqual([
      "mirotech/portfolio/cor/web_full/cor-01.webp",
    ]);
  });

  it("does not rewrite full-bleed or unrelated keys", () => {
    expect(publicMediaKeyFallbacks("portfolio/arc/web_full/hero.webp")).toEqual([]);
    expect(publicMediaKeyFallbacks("site/backgrounds/hero.mp4")).toEqual([]);
  });
});
