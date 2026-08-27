import { describe, expect, it } from "vitest";
import {
  isAllowedAttachKey,
  isBrightlineAttachKey,
  isMirotechSiteAttachKey,
  resolveAttachStorageValue,
} from "./attach-existing-keys";

describe("attach-existing-keys", () => {
  it("allows Brightline T9 mirotech/ and portfolio/", () => {
    expect(isBrightlineAttachKey("mirotech/product/web_full/a.webp")).toBe(true);
    expect(isBrightlineAttachKey("portfolio/arc/web_full/a.webp")).toBe(true);
    expect(isBrightlineAttachKey("work/architecture/x.webp")).toBe(true);
    expect(isBrightlineAttachKey("studio/x.webp")).toBe(true);
    expect(isBrightlineAttachKey("projects/foo/hero.webp")).toBe(false);
  });

  it("allows Mirotech site bucket prefixes", () => {
    expect(isMirotechSiteAttachKey("projects/foo/hero.webp")).toBe(true);
    expect(isMirotechSiteAttachKey("site/backgrounds/web/a.mp4")).toBe(true);
    expect(isMirotechSiteAttachKey("journal/post/cover.webp")).toBe(true);
    expect(isMirotechSiteAttachKey("resume/cv.pdf")).toBe(true);
    expect(isMirotechSiteAttachKey("mirotech/product/web_full/a.webp")).toBe(false);
  });

  it("isAllowedAttachKey respects vault", () => {
    expect(isAllowedAttachKey("mirotech/product/web_full/a.webp", "brightline")).toBe(true);
    expect(isAllowedAttachKey("projects/foo/hero.webp", "mirotech-site")).toBe(true);
    expect(isAllowedAttachKey("projects/foo/hero.webp", "brightline")).toBe(false);
    expect(isAllowedAttachKey("evil/../x", "brightline")).toBe(false);
    expect(isAllowedAttachKey("tmp/scratch.webp", "brightline")).toBe(false);
  });

  it("resolveAttachStorageValue stores CDN URL for mirotech-site", () => {
    expect(
      resolveAttachStorageValue(
        "projects/foo/hero.webp",
        "mirotech-site",
        "https://media.mirotech.solutions"
      )
    ).toBe("https://media.mirotech.solutions/projects/foo/hero.webp");
    expect(
      resolveAttachStorageValue("mirotech/product/web_full/a.webp", "brightline", null)
    ).toBe("mirotech/product/web_full/a.webp");
  });
});
