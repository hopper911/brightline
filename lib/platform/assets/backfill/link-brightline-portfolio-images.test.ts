import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockTableHasColumn, mockFetch, mockFindByRef, mockUpdate } = vi.hoisted(() => ({
  mockTableHasColumn: vi.fn(),
  mockFetch: vi.fn(),
  mockFindByRef: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock("@/lib/platform/assets/backfill/db/table-has-column", () => ({
  tableHasColumn: mockTableHasColumn,
}));

vi.mock("@/lib/r2-vaults", () => ({
  getR2VaultCredentials: vi.fn().mockReturnValue({ bucket: "brightline-bucket" }),
}));

vi.mock("@/lib/platform/assets/repository", () => ({
  findPlatformAssetByStorageRef: mockFindByRef,
}));

const client = {
  portfolioImage: { update: mockUpdate },
  platformAsset: { findUnique: vi.fn() },
  $queryRaw: mockFetch,
} as unknown as import("@prisma/client").PrismaClient;

import { runBrightlinePortfolioImageAssetLink } from "@/lib/platform/assets/backfill/link-brightline-portfolio-images";

describe("runBrightlinePortfolioImageAssetLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTableHasColumn.mockResolvedValue(true);
  });

  it("dry-run wouldLink without DB update", async () => {
    mockFetch.mockResolvedValue([
      {
        id: "img-1",
        url: "/api/media/public?key=portfolio%2Farc%2Fa.webp",
        thumbUrl: null,
        fullUrl: null,
        storageKey: null,
        assetId: null,
      },
    ]);
    mockFindByRef.mockResolvedValue({ id: "asset-1" });

    const report = await runBrightlinePortfolioImageAssetLink(
      { source: "brightline-portfolio", dryRun: true, linkDomain: true },
      client
    );

    expect(report.wouldLink).toBe(1);
    expect(report.linked).toBe(0);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("links assetId on execute", async () => {
    mockFetch.mockResolvedValue([
      {
        id: "img-1",
        url: "portfolio/arc/a.webp",
        thumbUrl: null,
        fullUrl: null,
        storageKey: "portfolio/arc/a.webp",
        assetId: null,
      },
    ]);
    mockFindByRef.mockResolvedValue({ id: "asset-1" });
    mockUpdate.mockResolvedValue({});

    const report = await runBrightlinePortfolioImageAssetLink(
      { source: "brightline-portfolio", dryRun: false, linkDomain: true },
      client
    );

    expect(report.linked).toBe(1);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "img-1" },
      data: { assetId: "asset-1" },
    });
  });

  it("skips when no registry match", async () => {
    mockFetch.mockResolvedValue([
      {
        id: "img-1",
        url: "portfolio/arc/a.webp",
        thumbUrl: null,
        fullUrl: null,
        storageKey: "portfolio/arc/a.webp",
        assetId: null,
      },
    ]);
    mockFindByRef.mockResolvedValue(null);

    const report = await runBrightlinePortfolioImageAssetLink(
      { source: "brightline-portfolio", dryRun: false, linkDomain: true },
      client
    );

    expect(report.noAssetMatch).toBe(1);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
