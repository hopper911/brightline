import { describe, expect, it } from "vitest";
import { brightlineAllMediaSourceLabel } from "./admin-r2-brightline-all-media";

describe("admin-r2-brightline-all-media", () => {
  it("labels portfolio pillar paths", () => {
    expect(
      brightlineAllMediaSourceLabel("portfolio/arc/web_full/hero.webp", "brightline")
    ).toBe("Portfolio · arc · web_full");
    expect(
      brightlineAllMediaSourceLabel("portfolio/cor/web_video/clip.mp4", "brightline")
    ).toBe("Portfolio · cor · web_video");
  });

  it("labels T9 port paths", () => {
    expect(
      brightlineAllMediaSourceLabel("mirotech/product/web_full/product-01.webp", "brightline")
    ).toBe("T9 · product · web_full");
  });

  it("labels site backgrounds and client galleries", () => {
    expect(
      brightlineAllMediaSourceLabel("site/backgrounds/web/clip-web.mp4", "brightline")
    ).toBe("Site background (web)");
    expect(
      brightlineAllMediaSourceLabel("client-galleries/wedding/img.webp", "brightline")
    ).toBe("Client gallery");
  });

  it("prefers DB ref source label when provided", () => {
    expect(
      brightlineAllMediaSourceLabel("work/foo/bg.mp4", "brightline", {
        sourceLabel: "Work · Noros",
      })
    ).toBe("Work · Noros");
  });
});
