import { describe, expect, it } from "vitest";
import {
  compareMediaByLastModified,
  sortMediaByLastModified,
} from "@/lib/admin-r2-unified-media-sort";

describe("sortMediaByLastModified", () => {
  it("orders newest modified first", () => {
    const items = sortMediaByLastModified([
      { key: "a/old.webp", lastModified: "2024-01-01T00:00:00.000Z" },
      { key: "b/new.webp", lastModified: "2026-08-01T00:00:00.000Z" },
      { key: "c/mid.webp", lastModified: "2025-06-01T00:00:00.000Z" },
    ]);
    expect(items.map((i) => i.key)).toEqual([
      "b/new.webp",
      "c/mid.webp",
      "a/old.webp",
    ]);
  });

  it("puts items without dates after dated items", () => {
    const items = sortMediaByLastModified([
      { key: "z/nodate.webp", lastModified: null },
      { key: "a/dated.webp", lastModified: "2025-01-01T00:00:00.000Z" },
    ]);
    expect(items[0].key).toBe("a/dated.webp");
    expect(items[1].key).toBe("z/nodate.webp");
  });

  it("compareMediaByLastModified is consistent with sort", () => {
    const a = { key: "a", lastModified: "2026-01-01T00:00:00.000Z" };
    const b = { key: "b", lastModified: "2025-01-01T00:00:00.000Z" };
    expect(compareMediaByLastModified(a, b)).toBeLessThan(0);
    expect(compareMediaByLastModified(b, a)).toBeGreaterThan(0);
  });
});
