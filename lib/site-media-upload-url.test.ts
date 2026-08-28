import { describe, expect, it } from "vitest";
import {
  buildSiteMediaObjectKey,
  resolveSiteMediaFolder,
  safeSiteMediaFilename,
} from "@/lib/site-media-upload-url";

describe("site-media upload URL helpers", () => {
  it("sanitizes filenames", () => {
    expect(safeSiteMediaFilename("../../evil/name.jpg")).toBe("name.jpg");
    expect(safeSiteMediaFilename("")).toBe("media");
  });

  it("defaults folder to blocks when invalid", () => {
    expect(resolveSiteMediaFolder(undefined)).toBe("blocks");
    expect(resolveSiteMediaFolder("  pages  ")).toBe("pages");
    expect(resolveSiteMediaFolder("unknown")).toBe("blocks");
  });

  it("builds stable site/ keys", () => {
    expect(buildSiteMediaObjectKey("pages", "hero.jpg", 1_700_000_000_000)).toBe(
      "site/pages/1700000000000-hero.jpg"
    );
  });
});
