import { describe, expect, it } from "vitest";
import { mirotechAllMediaSourceLabel } from "./admin-r2-mirotech-all-media";

describe("admin-r2-mirotech-all-media", () => {
  it("labels CMS bucket paths", () => {
    expect(
      mirotechAllMediaSourceLabel("site/backgrounds/web/1734567890-clip-web.mp4", "mirotech-site")
    ).toBe("CMS backgrounds (web)");
    expect(mirotechAllMediaSourceLabel("projects/foo/hero.webp", "mirotech-site")).toBe(
      "CMS projects"
    );
  });

  it("labels Brightline T9 port paths", () => {
    expect(
      mirotechAllMediaSourceLabel("mirotech/product/web_full/product-01.webp", "brightline")
    ).toBe("T9 product/web_full");
    expect(
      mirotechAllMediaSourceLabel("mirotech/motion/web_video/clip-01.mp4", "brightline")
    ).toBe("T9 motion/web_video");
  });
});
