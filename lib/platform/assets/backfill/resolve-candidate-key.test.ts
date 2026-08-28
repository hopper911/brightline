import { describe, expect, it } from "vitest";
import { resolveStorageReferenceFromStoredValue } from "@/lib/platform/assets/backfill/resolve-candidate-key";

describe("resolveStorageReferenceFromStoredValue", () => {
  it("extracts bare portfolio keys", () => {
    const result = resolveStorageReferenceFromStoredValue("portfolio/arc/hero.webp", {
      expectVault: "brightline",
      publishedPublic: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.objectKey).toBe("portfolio/arc/hero.webp");
      expect(result.vault).toBe("brightline");
      expect(result.visibility).toBe("PUBLIC");
    }
  });

  it("extracts keys from /api/media/public URLs", () => {
    const result = resolveStorageReferenceFromStoredValue(
      "/api/media/public?key=portfolio%2Facd%2Fphoto.webp",
      { expectVault: "brightline", publishedPublic: true }
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.objectKey).toBe("portfolio/acd/photo.webp");
    }
  });

  it("rejects vault mismatch", () => {
    const result = resolveStorageReferenceFromStoredValue("projects/site/hero.webp", {
      expectVault: "brightline",
      publishedPublic: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("invalidReference");
    }
  });

  it("prefers PRIVATE for non-public prefixes on published rows", () => {
    const result = resolveStorageReferenceFromStoredValue("client-galleries/g1/photo.jpg", {
      expectVault: "brightline",
      publishedPublic: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.visibility).toBe("PRIVATE");
      expect(result.visibilityAmbiguous).toBe(true);
    }
  });

  it("rejects empty references", () => {
    const result = resolveStorageReferenceFromStoredValue("", {
      expectVault: "brightline",
      publishedPublic: true,
    });
    expect(result.ok).toBe(false);
  });
});
