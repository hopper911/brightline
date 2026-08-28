import { describe, expect, it } from "vitest";
import {
  buildSiteBackgroundObjectKey,
  resolveSiteBackgroundFolder,
  safeSiteBackgroundFileName,
} from "@/lib/site-background-upload-url";

describe("site-background upload URL helpers", () => {
  it("sanitizes file names", () => {
    expect(safeSiteBackgroundFileName("  hero video.mp4  ")).toBe("hero-video.mp4");
    expect(safeSiteBackgroundFileName("")).toBe("");
  });

  it("resolves folder variants", () => {
    expect(resolveSiteBackgroundFolder("web")).toBe("web");
    expect(resolveSiteBackgroundFolder("posters")).toBe("posters");
    expect(resolveSiteBackgroundFolder(undefined)).toBe("full");
  });

  it("builds site/backgrounds keys", () => {
    expect(buildSiteBackgroundObjectKey("web", "clip.mp4", 1)).toBe(
      "site/backgrounds/web/1-clip.mp4"
    );
  });
});
