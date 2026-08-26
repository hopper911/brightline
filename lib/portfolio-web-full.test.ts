import { describe, expect, it } from "vitest";
import { preferPortfolioWebFullKey } from "@/lib/portfolio-web-full";

describe("preferPortfolioWebFullKey", () => {
  it("upgrades portfolio web_thumb keys to web_full", () => {
    expect(preferPortfolioWebFullKey("portfolio/arc/web_thumb/arc-260813-01.webp")).toBe(
      "portfolio/arc/web_full/arc-260813-01.webp"
    );
  });

  it("leaves web_full keys unchanged", () => {
    expect(preferPortfolioWebFullKey("portfolio/arc/web_full/arc-260813-01.webp")).toBe(
      "portfolio/arc/web_full/arc-260813-01.webp"
    );
  });

  it("rewrites key= query on media public URLs", () => {
    const url =
      "https://brightlinephotography.com/api/media/public?key=portfolio%2Farc%2Fweb_thumb%2Fx.webp";
    expect(preferPortfolioWebFullKey(url)).toContain("web_full");
    expect(preferPortfolioWebFullKey(url)).not.toContain("web_thumb");
  });
});
