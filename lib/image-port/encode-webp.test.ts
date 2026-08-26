import { describe, expect, it } from "vitest";
import {
  formatPortfolioStem,
  isImagePortTempKey,
  maxSeqFromKeys,
  portfolioKeysForStem,
} from "./encode-webp";

describe("image-port encode helpers", () => {
  it("guards temp keys", () => {
    expect(isImagePortTempKey("tmp/image-port/arc/abc.jpg")).toBe(true);
    expect(isImagePortTempKey("portfolio/arc/web_full/x.webp")).toBe(false);
    expect(isImagePortTempKey("tmp/image-port/../evil.jpg")).toBe(false);
  });

  it("builds portfolio keys", () => {
    const stem = formatPortfolioStem("arc", "260811", 2);
    expect(stem).toBe("arc-260811-02");
    expect(portfolioKeysForStem("arc", stem)).toEqual({
      fullKey: "portfolio/arc/web_full/arc-260811-02.webp",
      thumbKey: "portfolio/arc/web_thumb/arc-260811-02.webp",
    });
    expect(portfolioKeysForStem("product", "product-260811-02", "mirotech")).toEqual({
      fullKey: "mirotech/product/web_full/product-260811-02.webp",
      thumbKey: "mirotech/product/web_thumb/product-260811-02.webp",
    });
  });

  it("finds next seq from listed keys", () => {
    const max = maxSeqFromKeys(
      [
        "portfolio/arc/web_full/arc-260811-01.webp",
        "portfolio/arc/web_full/arc-260811-03.webp",
        "portfolio/arc/web_full/arc-260810-99.webp",
      ],
      "arc",
      "260811"
    );
    expect(max).toBe(3);
    expect(
      maxSeqFromKeys(
        ["mirotech/product/web_full/product-260811-02.webp"],
        "product",
        "260811",
        "mirotech"
      )
    ).toBe(2);
  });
});
