import { describe, expect, it } from "vitest";
import { isMirotechSitePublicUrl, resolveStoredMediaUrl } from "./r2";

describe("resolveStoredMediaUrl Mirotech CDN", () => {
  it("passes through media.mirotech.solutions URLs", () => {
    const url = "https://media.mirotech.solutions/projects/foo/hero.webp";
    expect(resolveStoredMediaUrl(url)).toBe(url);
    expect(isMirotechSitePublicUrl(url)).toBe(true);
  });

  it("passes through other *.mirotech.solutions CDN hosts", () => {
    const url = "https://cdn.mirotech.solutions/site/backgrounds/web/clip.mp4";
    expect(resolveStoredMediaUrl(url)).toBe(url);
  });

  it("still proxies Brightline object keys via /api/media/public", () => {
    expect(resolveStoredMediaUrl("mirotech/product/web_full/a.webp")).toBe(
      "/api/media/public?key=mirotech%2Fproduct%2Fweb_full%2Fa.webp"
    );
    expect(resolveStoredMediaUrl("portfolio/arc/web_full/a.webp")).toContain(
      "/api/media/public?key="
    );
  });

  it("does not treat unrelated https URLs as Mirotech CDN", () => {
    expect(isMirotechSitePublicUrl("https://example.com/projects/x.webp")).toBe(false);
  });
});
