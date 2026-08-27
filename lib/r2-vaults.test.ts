import { describe, expect, it } from "vitest";
import {
  defaultPrefixForVault,
  inferVaultFromPrefix,
  isR2VaultId,
  MIROTECH_SITE_ALLOWED_PREFIXES,
  normalizeR2VaultId,
  resolveVaultForListPrefix,
} from "./r2-vaults-shared";

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

  it("infers vault from folder prefix", () => {
    expect(inferVaultFromPrefix("portfolio/arc/web_video/")).toBe("brightline");
    expect(inferVaultFromPrefix("mirotech/product/web_full/")).toBe("brightline");
    expect(inferVaultFromPrefix("projects/foo/")).toBe("mirotech-site");
    expect(inferVaultFromPrefix("")).toBeNull();
  });

  it("default prefix per vault", () => {
    expect(defaultPrefixForVault("brightline")).toBe("portfolio/");
    expect(defaultPrefixForVault("mirotech-site")).toBe("site/");
  });

  it("resolveVaultForListPrefix maps cross-bucket folder paths", () => {
    expect(resolveVaultForListPrefix("projects/foo/", "brightline")).toBe("mirotech-site");
    expect(resolveVaultForListPrefix("mirotech/", "mirotech-site")).toBe("brightline");
    expect(resolveVaultForListPrefix("portfolio/cor/", "mirotech-site")).toBe("brightline");
    expect(resolveVaultForListPrefix("", "mirotech-site")).toBe("mirotech-site");
  });
});
