import { describe, expect, it } from "vitest";
import {
  defaultVaultForTenant,
  isMediaStorageVault,
  normalizeMediaObjectKey,
} from "@/lib/platform/media/types";

describe("platform media types", () => {
  it("normalizes object keys", () => {
    expect(normalizeMediaObjectKey("/portfolio/arc/web_full/foo.webp")).toBe(
      "portfolio/arc/web_full/foo.webp"
    );
  });

  it("maps tenant slug to default vault metadata", () => {
    expect(defaultVaultForTenant("brightline")).toBe("brightline");
    expect(defaultVaultForTenant("mirotech")).toBe("mirotech-site");
  });

  it("validates vault ids", () => {
    expect(isMediaStorageVault("brightline")).toBe(true);
    expect(isMediaStorageVault("mirotech-site")).toBe(true);
    expect(isMediaStorageVault("other")).toBe(false);
  });
});
