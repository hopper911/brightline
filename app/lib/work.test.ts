import { describe, it, expect } from "vitest";
import {
  slugifyCategory,
  makeCover,
  makeGallery,
  workItems,
} from "./work";

describe("slugifyCategory", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugifyCategory("Commercial Photography")).toBe(
      "commercial-photography"
    );
  });
  it("replaces & with and", () => {
    expect(slugifyCategory("Food & Beverage")).toBe("food-and-beverage");
  });
  it("strips leading/trailing hyphens", () => {
    expect(slugifyCategory("  Fashion  ")).toBe("fashion");
  });
});

describe("makeCover", () => {
  it("returns svg path by default", () => {
    expect(makeCover("real-estate-01")).toBe("/work/real-estate-01/cover.svg");
  });
  it("supports jpg extension", () => {
    expect(makeCover("hotel-01", "jpg")).toBe("/work/hotel-01/cover.jpg");
  });
});

describe("makeGallery", () => {
  it("returns cover and detail paths", () => {
    const gallery = makeGallery("real-estate-01");
    expect(gallery).toHaveLength(3);
    expect(gallery[0]).toBe("/work/real-estate-01/cover.svg");
    expect(gallery[1]).toBe("/work/real-estate-01/detail-01.svg");
    expect(gallery[2]).toBe("/work/real-estate-01/detail-02.svg");
  });
});

describe("workItems", () => {
  it("has items with required fields", () => {
    expect(workItems.length).toBeGreaterThan(0);
    for (const item of workItems) {
      expect(item).toHaveProperty("slug");
      expect(item).toHaveProperty("title");
      expect(item).toHaveProperty("category");
      expect(item).toHaveProperty("cover");
      expect(item.gallery.length).toBeGreaterThan(0);
    }
  });
});
