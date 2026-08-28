import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { mockFindAssetsByIds, mockGetAssetUrl, mockResolveDomainMedia } = vi.hoisted(() => ({
  mockFindAssetsByIds: vi.fn(),
  mockGetAssetUrl: vi.fn(),
  mockResolveDomainMedia: vi.fn(),
}));

vi.mock("@/lib/platform/assets/repository-batch", () => ({
  findPlatformAssetsByIds: mockFindAssetsByIds,
}));

vi.mock("@/lib/platform/assets/resolve-domain-media", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/platform/assets/resolve-domain-media")>();
  return {
    ...actual,
    resolveDomainMedia: mockResolveDomainMedia,
  };
});

vi.mock("@/lib/platform/media/server", () => ({
  defaultMediaService: {
    getAssetUrl: mockGetAssetUrl,
  },
}));

import { enrichPortfolioProjectsForAdminRead } from "@/lib/platform/assets/integrations/portfolio-image-delivery";

const ENV_KEY = "PLATFORM_ASSET_READ_ENABLED";

describe("enrichPortfolioProjectsForAdminRead", () => {
  const savedEnv = process.env[ENV_KEY];

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env[ENV_KEY];
    mockFindAssetsByIds.mockResolvedValue(new Map());
    mockGetAssetUrl.mockResolvedValue({
      kind: "public-delivery",
      url: "/api/media/public?key=portfolio%2Farc%2Fa.webp",
    });
    mockResolveDomainMedia.mockResolvedValue({
      objectRef: { vault: "brightline", objectKey: "portfolio/arc/a.webp" },
      source: "asset",
    });
  });

  afterEach(() => {
    if (savedEnv === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = savedEnv;
  });

  it("returns projects unchanged when flag is off", async () => {
    const projects = [
      {
        id: "p1",
        images: [{ id: "i1", url: "legacy-url", sortOrder: 0, assetId: "asset-1" }],
      },
    ];
    const result = await enrichPortfolioProjectsForAdminRead(projects);
    expect(result).toEqual(projects);
    expect(mockFindAssetsByIds).not.toHaveBeenCalled();
  });

  it("batch preloads assets and resolves delivery urls when flag on", async () => {
    process.env[ENV_KEY] = "true";
    const projects = [
      {
        id: "p1",
        images: [
          { id: "i1", url: "legacy-url", sortOrder: 0, assetId: "asset-1" },
          { id: "i2", url: "legacy-2", sortOrder: 1, assetId: null },
        ],
      },
    ];

    const result = await enrichPortfolioProjectsForAdminRead(projects);

    expect(mockFindAssetsByIds).toHaveBeenCalledWith(["asset-1"]);
    expect(mockResolveDomainMedia).toHaveBeenCalledTimes(2);
    expect(result[0]?.images[0]?.url).toBe("/api/media/public?key=portfolio%2Farc%2Fa.webp");
    expect(result[0]?.images[0]?.assetId).toBe("asset-1");
  });
});
