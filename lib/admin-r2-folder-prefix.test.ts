import { describe, expect, it } from "vitest";
import { isValidR2FolderPrefix } from "./admin-r2-manager";

describe("isValidR2FolderPrefix", () => {
  it("rejects undefined and null segment folders", () => {
    expect(isValidR2FolderPrefix("portfolio/undefined/")).toBe(false);
    expect(isValidR2FolderPrefix("portfolio/null/")).toBe(false);
  });

  it("accepts normal folder prefixes", () => {
    expect(isValidR2FolderPrefix("portfolio/arc/")).toBe(true);
    expect(isValidR2FolderPrefix("portfolio/advertising/")).toBe(true);
  });
});
