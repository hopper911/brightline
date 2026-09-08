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

  it("unwraps nested r2.dev URLs stuffed into ?key=", () => {
    const nested =
      "/api/media/public?key=" +
      encodeURIComponent(
        "https://pub-e4f27d327e8c4c10ba1bf416083a4e72.r2.dev/portfolio/cam/web_full/cam-260324-01.webp"
      );
    expect(resolveStoredMediaUrl(nested)).toBe(
      "/api/media/public?key=portfolio%2Fcam%2Fweb_full%2Fcam-260324-01.webp"
    );
  });

  it("extracts object keys from public r2.dev URLs", () => {
    expect(
      resolveStoredMediaUrl(
        "https://pub-e4f27d327e8c4c10ba1bf416083a4e72.r2.dev/portfolio/cam/web_full/cam-260324-01.webp"
      )
    ).toBe("/api/media/public?key=portfolio%2Fcam%2Fweb_full%2Fcam-260324-01.webp");
  });
});
