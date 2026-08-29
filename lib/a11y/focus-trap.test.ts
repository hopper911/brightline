import { describe, expect, it } from "vitest";
import { FOCUSABLE_SELECTOR } from "./focus-trap";

describe("focus-trap", () => {
  it("FOCUSABLE_SELECTOR covers standard interactive controls", () => {
    expect(FOCUSABLE_SELECTOR).toContain("button:not([disabled])");
    expect(FOCUSABLE_SELECTOR).toContain("a[href]");
    expect(FOCUSABLE_SELECTOR).toContain("[tabindex]:not([tabindex='-1'])");
  });
});
