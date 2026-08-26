import { describe, expect, it } from "vitest";
import {
  gallerySingleImageRenderMode,
  normalizeImageSideLayout,
} from "@/lib/dual-brand/case-study-template";

describe("normalizeImageSideLayout", () => {
  it("defaults to stack when no side text", () => {
    const out = normalizeImageSideLayout({});
    expect(out.layout).toBe("stack");
    expect(out.hasSideContent).toBe(false);
    expect(out.sideType).toBe("caption");
    expect(out.imagePosition).toBe("left");
  });

  it("infers side layout when caption exists", () => {
    const out = normalizeImageSideLayout({ caption: "Whiteboard iteration notes." });
    expect(out.layout).toBe("side");
    expect(out.hasSideContent).toBe(true);
    expect(out.caption).toBe("Whiteboard iteration notes.");
  });

  it("respects explicit stack layout", () => {
    const out = normalizeImageSideLayout({
      caption: "Below the image",
      layout: "stack",
    });
    expect(out.layout).toBe("stack");
    expect(out.hasSideContent).toBe(true);
  });

  it("reads quote side content", () => {
    const out = normalizeImageSideLayout({
      sideType: "quote",
      quote: "Ops teams need one pane of glass.",
      attribution: "Research synthesis",
    });
    expect(out.sideType).toBe("quote");
    expect(out.hasSideContent).toBe(true);
    expect(out.quote).toBe("Ops teams need one pane of glass.");
    expect(out.attribution).toBe("Research synthesis");
  });

  it("honors image position right", () => {
    const out = normalizeImageSideLayout({
      caption: "Side note",
      imagePosition: "right",
    });
    expect(out.imagePosition).toBe("right");
  });
});

describe("gallerySingleImageRenderMode", () => {
  it("uses full width for one image without side text", () => {
    expect(gallerySingleImageRenderMode(1, {})).toBe("full");
  });

  it("uses side layout for one image with caption", () => {
    expect(gallerySingleImageRenderMode(1, { caption: "Caption" })).toBe("side");
  });

  it("uses grid for multiple images", () => {
    expect(gallerySingleImageRenderMode(3, { caption: "Ignored" })).toBe("grid");
  });
});
