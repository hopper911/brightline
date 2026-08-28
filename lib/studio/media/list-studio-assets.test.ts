import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    platformAsset: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/platform/assets/registry-service", () => ({
  platformAssetRegistryService: {
    listByTenant: vi.fn(),
    findById: vi.fn(),
  },
}));

import { platformAssetRegistryService } from "@/lib/platform/assets/registry-service";
import {
  getStudioAssetDetail,
  listStudioAssetsForTenant,
} from "@/lib/studio/media/list-studio-assets";

describe("studio media listing", () => {
  const savedAssets = process.env.PLATFORM_ASSET_REGISTRY_ENABLED;

  beforeEach(() => {
    process.env.PLATFORM_ASSET_REGISTRY_ENABLED = "true";
    vi.mocked(platformAssetRegistryService.listByTenant).mockReset();
    vi.mocked(platformAssetRegistryService.findById).mockReset();
  });

  afterEach(() => {
    if (savedAssets === undefined) delete process.env.PLATFORM_ASSET_REGISTRY_ENABLED;
    else process.env.PLATFORM_ASSET_REGISTRY_ENABLED = savedAssets;
  });

  it("returns empty when registry disabled", async () => {
    delete process.env.PLATFORM_ASSET_REGISTRY_ENABLED;
    const listing = await listStudioAssetsForTenant("brightline");
    expect(listing.enabled).toBe(false);
    expect(listing.items).toEqual([]);
  });

  it("lists assets for active tenant context", async () => {
    vi.mocked(platformAssetRegistryService.listByTenant).mockResolvedValue({
      items: [
        {
          id: "asset-1",
          tenantId: "t1",
          tenantSlug: "brightline",
          provider: "R2",
          vault: "brightline",
          bucket: "b",
          objectKey: "portfolio/x.jpg",
          filename: "x.jpg",
          mimeType: "image/jpeg",
          visibility: "PRIVATE",
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    const listing = await listStudioAssetsForTenant("brightline");
    expect(listing.items).toHaveLength(1);
    expect(listing.partialCoverage).toBe(true);
  });

  it("blocks cross-tenant asset detail", async () => {
    vi.mocked(platformAssetRegistryService.findById).mockResolvedValue({
      id: "asset-1",
      tenantId: "t1",
      tenantSlug: "mirotech",
      provider: "R2",
      vault: "mirotech-site",
      bucket: "b",
      objectKey: "x.jpg",
      filename: null,
      mimeType: null,
      visibility: "PRIVATE",
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const asset = await getStudioAssetDetail("brightline", "asset-1");
    expect(asset).toBeNull();
  });
});
