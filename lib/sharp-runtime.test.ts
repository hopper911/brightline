import { describe, expect, it } from "vitest";
import sharp from "sharp";

describe("sharp 0.35 runtime", () => {
  it("decodes and resizes a tiny JPEG without failOnError", async () => {
    const src = await sharp({
      create: { width: 8, height: 8, channels: 3, background: { r: 12, g: 12, b: 12 } },
    })
      .jpeg()
      .toBuffer();

    const out = await sharp(src, { failOn: "none" })
      .rotate()
      .resize(4, 4)
      .webp({ quality: 70 })
      .toBuffer();

    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(4);
    expect(meta.height).toBe(4);
  });
});
