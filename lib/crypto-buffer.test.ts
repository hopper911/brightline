import { describe, expect, it } from "vitest";
import { timingSafeUtf8Equal } from "@/lib/crypto-buffer";

describe("timingSafeUtf8Equal", () => {
  it("matches equal secrets of different lengths from a naive compare", () => {
    expect(timingSafeUtf8Equal("alpha", "alpha")).toBe(true);
    expect(timingSafeUtf8Equal("alpha", "beta")).toBe(false);
    expect(timingSafeUtf8Equal("short", "much-longer-secret")).toBe(false);
    expect(timingSafeUtf8Equal("", "x")).toBe(false);
  });
});
