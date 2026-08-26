import { describe, expect, it } from "vitest";
import {
  isR2VaultId,
  MIROTECH_SITE_ALLOWED_PREFIXES,
  normalizeR2VaultId,
} from "./r2-vaults";

describe("r2-vaults", () => {
  it("normalizes vault ids", () => {
    expect(isR2VaultId("brightline")).toBe(true);
    expect(isR2VaultId("mirotech-site")).toBe(true);
    expect(isR2VaultId("other")).toBe(false);
    expect(normalizeR2VaultId(undefined)).toBe("brightline");
    expect(normalizeR2VaultId("mirotech-site")).toBe("mirotech-site");
  });

  it("allowlists Mirotech site CMS prefixes only", () => {
    expect(MIROTECH_SITE_ALLOWED_PREFIXES).toEqual([
      "projects/",
      "journal/",
      "resume/",
      "site/",
    ]);
  });
});
