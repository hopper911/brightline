import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { mockFindAssetById } = vi.hoisted(() => ({
  mockFindAssetById: vi.fn(),
}));

vi.mock("@/lib/platform/assets/repository", () => ({
  findPlatformAssetById: mockFindAssetById,
}));

import { resolveDomainMedia } from "@/lib/platform/assets/resolve-domain-media";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";

const ENV_KEY = "PLATFORM_ASSET_READ_ENABLED";
const context = createPlatformContextForTenant("brightline");

describe("resolveDomainMedia", () => {
  const savedEnv = process.env[ENV_KEY];

  beforeEach(() => {
    mockFindAssetById.mockReset();
    delete process.env[ENV_KEY];
  });

  afterEach(() => {
    if (savedEnv === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = savedEnv;
  });

  it("uses legacy only when asset-read flag is off", async () => {
    const result = await resolveDomainMedia(
      {
        assetId: "asset-1",
        legacyReference: "portfolio/arc/photo.webp",
      },
      context,
      { lookupAssetById: mockFindAssetById }
    );
    expect(result.source).toBe("legacy");
    expect(result.objectRef?.objectKey).toBe("portfolio/arc/photo.webp");
    expect(mockFindAssetById).not.toHaveBeenCalled();
  });

  it("resolves via asset when flag on and legacy absent", async () => {
    process.env[ENV_KEY] = "true";
    mockFindAssetById.mockResolvedValue({
      id: "asset-1",
      vault: "brightline",
      objectKey: "portfolio/arc/photo.webp",
    });

    const result = await resolveDomainMedia(
      { assetId: "asset-1" },
      context,
      { lookupAssetById: mockFindAssetById }
    );

    expect(result.source).toBe("asset");
    expect(result.objectRef).toEqual({
      vault: "brightline",
      objectKey: "portfolio/arc/photo.webp",
    });
  });

  it("falls back to legacy when asset missing but legacy valid", async () => {
    process.env[ENV_KEY] = "true";
    mockFindAssetById.mockResolvedValue(null);

    const result = await resolveDomainMedia(
      {
        assetId: "missing",
        legacyReference: "portfolio/arc/photo.webp",
      },
      context,
      { lookupAssetById: mockFindAssetById }
    );

    expect(result.source).toBe("legacy");
    expect(result.objectRef?.objectKey).toBe("portfolio/arc/photo.webp");
  });

  it("prefers legacy when asset and legacy conflict", async () => {
    process.env[ENV_KEY] = "true";
    mockFindAssetById.mockResolvedValue({
      id: "asset-1",
      vault: "brightline",
      objectKey: "portfolio/arc/a.webp",
    });

    const result = await resolveDomainMedia(
      {
        assetId: "asset-1",
        legacyReference: "portfolio/arc/b.webp",
      },
      context,
      { lookupAssetById: mockFindAssetById }
    );

    expect(result.source).toBe("legacy");
    expect(result.objectRef?.objectKey).toBe("portfolio/arc/b.webp");
    expect(result.conflict?.legacyObjectKey).toBe("portfolio/arc/b.webp");
  });

  it("uses asset when asset and legacy agree", async () => {
    process.env[ENV_KEY] = "true";
    mockFindAssetById.mockResolvedValue({
      id: "asset-1",
      vault: "brightline",
      objectKey: "portfolio/arc/photo.webp",
    });

    const result = await resolveDomainMedia(
      {
        assetId: "asset-1",
        legacyReference: "/api/media/public?key=portfolio%2Farc%2Fphoto.webp",
      },
      context,
      { lookupAssetById: mockFindAssetById }
    );

    expect(result.source).toBe("asset");
    expect(result.conflict).toBeUndefined();
  });
});
