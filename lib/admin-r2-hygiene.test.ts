import { describe, expect, it } from "vitest";
import {
  collectKeysFromUnknown,
  duplicateStem,
  groupDuplicateKeys,
  isHeavyObject,
  looksLikeR2Key,
} from "./admin-r2-hygiene";

describe("admin-r2-hygiene", () => {
  it("stems ignore thumb suffix and sort prefixes", () => {
    expect(duplicateStem("01_hero-thumb.webp")).toBe("hero");
    expect(duplicateStem("arc-260811-02.webp")).toBe("arc-260811-02");
  });

  it("does not treat a full+thumb pair as a duplicate", () => {
    const groups = groupDuplicateKeys([
      { key: "portfolio/arc/web_full/arc-260811-01.webp", size: 100 },
      { key: "portfolio/arc/web_thumb/arc-260811-01.webp", size: 20 },
    ]);
    expect(groups).toEqual([]);
  });

  it("groups same stem in different folders", () => {
    const groups = groupDuplicateKeys([
      { key: "portfolio/arc/web_full/hero.webp", size: 100 },
      { key: "work/architecture/hero.webp", size: 90 },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.keys).toHaveLength(2);
  });

  it("flags heavy images and videos", () => {
    expect(isHeavyObject("a/b.jpg", 2 * 1024 * 1024)).toBe(true);
    expect(isHeavyObject("a/b.webp", 400_000)).toBe(false);
    expect(isHeavyObject("a/b.mp4", 20 * 1024 * 1024)).toBe(true);
    expect(isHeavyObject("a/b.mp4", 5 * 1024 * 1024)).toBe(false);
    expect(isHeavyObject("a/b.pdf", 9 * 1024 * 1024)).toBe(true);
  });

  it("extracts R2 keys from nested JSON", () => {
    const out = new Set<string>();
    collectKeysFromUnknown(
      { pillars: [{ coverImageKey: "site/covers/a.webp" }], skip: "https://x.com/y" },
      out
    );
    expect(out.has("site/covers/a.webp")).toBe(true);
    expect(out.size).toBe(1);
  });

  it("rejects URLs as keys", () => {
    expect(looksLikeR2Key("https://example.com/a.webp")).toBe(false);
    expect(looksLikeR2Key("portfolio/arc/web_full/a.webp")).toBe(true);
  });
});
