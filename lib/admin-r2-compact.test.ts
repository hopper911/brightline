import { describe, expect, it } from "vitest";
import { compactDestKeys, safeStem } from "./admin-r2-compact";

describe("compact dest keys", () => {
  it("pairs web_full with web_thumb", () => {
    expect(compactDestKeys("portfolio/cor/web_full/", "hero.png")).toEqual({
      fullKey: "portfolio/cor/web_full/hero.webp",
      thumbKey: "portfolio/cor/web_thumb/hero.webp",
    });
  });

  it("writes sibling -thumb in generic folders", () => {
    expect(compactDestKeys("client-galleries/g1/", "shot.jpg")).toEqual({
      fullKey: "client-galleries/g1/shot.webp",
      thumbKey: "client-galleries/g1/shot-thumb.webp",
    });
  });

  it("sanitizes stems", () => {
    expect(safeStem("mirotech logo .png")).toBe("mirotech-logo");
  });
});
