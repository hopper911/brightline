import { describe, expect, it } from "vitest";
import { assertValidMediaObjectKey } from "@/lib/platform/media/validate-object-key";
import { normalizeMediaError, isNotFoundError } from "@/lib/platform/media/normalize-error";
import { MediaConfigurationError, MediaNotFoundError } from "@/lib/platform/media/errors";

describe("assertValidMediaObjectKey", () => {
  it("normalizes leading slashes without changing namespace", () => {
    expect(assertValidMediaObjectKey("/portfolio/arc/a.webp")).toBe("portfolio/arc/a.webp");
    expect(assertValidMediaObjectKey("mirotech/product/web_full/a.webp")).toBe(
      "mirotech/product/web_full/a.webp"
    );
  });

  it("rejects traversal and URLs", () => {
    expect(() => assertValidMediaObjectKey("../secret")).toThrow();
    expect(() => assertValidMediaObjectKey("https://evil.example/x")).toThrow();
  });
});

describe("normalizeMediaError", () => {
  it("maps 404 to MediaNotFoundError", () => {
    const err = normalizeMediaError(
      Object.assign(new Error("missing"), { name: "NotFound" }),
      "headObject"
    );
    expect(err).toBeInstanceOf(MediaNotFoundError);
  });

  it("maps credential messages to configuration errors", () => {
    const err = normalizeMediaError(new Error("R2 credentials not configured"), "signPut");
    expect(err).toBeInstanceOf(MediaConfigurationError);
  });
});

describe("isNotFoundError", () => {
  it("detects AWS not-found shapes", () => {
    expect(isNotFoundError({ name: "NoSuchKey" })).toBe(true);
    expect(isNotFoundError({ $metadata: { httpStatusCode: 404 } })).toBe(true);
    expect(isNotFoundError(new Error("other"))).toBe(false);
  });
});
