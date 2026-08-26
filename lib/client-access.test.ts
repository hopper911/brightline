import { describe, expect, it } from "vitest";
import {
  generateGalleryAccessCode,
  hashAccessCode,
  normalizeAccessCodeInput,
  verifyAccessCode,
} from "@/lib/client-access";

describe("generateGalleryAccessCode", () => {
  it("returns 12 unambiguous uppercase alphanumeric chars", () => {
    const code = generateGalleryAccessCode();
    expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{12}$/);
  });
});

describe("hashAccessCode", () => {
  it("stores only a suffix hint, not the full code", () => {
    const code = "ABCD-EFGH-JKLM";
    const hashed = hashAccessCode(code);
    expect(hashed.hint).toBe("JKLM");
    expect(hashed.hint).not.toBe(normalizeAccessCodeInput(code));
  });
});

describe("verifyAccessCode", () => {
  it("accepts normalized input with separators", () => {
    const code = generateGalleryAccessCode();
    const hashed = hashAccessCode(code);
    const spaced = `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8)}`;
    expect(verifyAccessCode(spaced, hashed.hash, hashed.salt)).toBe(true);
  });
});
