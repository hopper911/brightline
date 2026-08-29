import { describe, expect, it } from "vitest";
import { prefersReducedMotion } from "./prefers-reduced-motion";

describe("prefersReducedMotion", () => {
  it("returns false when window is undefined (SSR)", () => {
    expect(prefersReducedMotion()).toBe(false);
  });
});
