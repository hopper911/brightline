import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  mockCollect,
  mockFindByRef,
  mockUpsert,
  mockEnsureTenant,
  mockResolveBucket,
  mockHeadObject,
  mockAudit,
} = vi.hoisted(() => ({
  mockCollect: vi.fn(),
  mockFindByRef: vi.fn(),
  mockUpsert: vi.fn(),
  mockEnsureTenant: vi.fn(),
  mockResolveBucket: vi.fn(),
  mockHeadObject: vi.fn(),
  mockAudit: vi.fn(),
}));

vi.mock("@/lib/platform/assets/backfill/collect-candidates", () => ({
  collectBackfillCandidates: mockCollect,
}));

vi.mock("@/lib/platform/assets/repository", () => ({
  findPlatformAssetByStorageRef: mockFindByRef,
  upsertPlatformAssetFromStorageRef: mockUpsert,
}));

vi.mock("@/lib/platform/tenants/repository", () => ({
  ensurePlatformTenant: mockEnsureTenant,
}));

vi.mock("@/lib/r2-vaults", () => ({
  getR2VaultCredentials: mockResolveBucket.mockImplementation(() => ({ bucket: "brightline-bucket" })),
}));

vi.mock("@/lib/storage-r2", () => ({
  headObject: mockHeadObject,
}));

vi.mock("@/lib/platform/audit/record-safely", () => ({
  recordAuditSafely: mockAudit,
}));

import { runAssetBackfill } from "@/lib/platform/assets/backfill/run-backfill";

const candidate = {
  source: "brightline-portfolio" as const,
  recordId: "img-1",
  recordType: "PortfolioImage",
  objectKey: "portfolio/arc/photo.webp",
  vault: "brightline" as const,
  tenantSlug: "brightline" as const,
  visibility: "PUBLIC" as const,
  filename: "photo.webp",
  mimeType: "image/webp",
  metadata: { backfillSource: "brightline-portfolio" },
};

describe("runAssetBackfill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveBucket.mockReturnValue("brightline-bucket");
    mockEnsureTenant.mockResolvedValue({ id: "tenant-1", slug: "brightline" });
    delete process.env.PLATFORM_AUDIT_ENABLED;
  });

  it("dry-run reports wouldRegister without writes", async () => {
    mockCollect.mockResolvedValue({
      rowsExamined: 1,
      candidates: [candidate],
      invalidReferences: [],
    });
    mockFindByRef.mockResolvedValue(null);

    const report = await runAssetBackfill({
      source: "brightline-portfolio",
      dryRun: true,
    });

    expect(report.wouldRegister).toBe(1);
    expect(report.registered).toBe(0);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("registers new assets on execute", async () => {
    mockCollect.mockResolvedValue({
      rowsExamined: 1,
      candidates: [candidate],
      invalidReferences: [],
    });
    mockFindByRef.mockResolvedValue(null);
    mockUpsert.mockResolvedValue({
      created: true,
      asset: { id: "asset-1" },
    });

    const report = await runAssetBackfill({
      source: "brightline-portfolio",
      dryRun: false,
    });

    expect(report.registered).toBe(1);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });

  it("reuses existing assets without duplicates", async () => {
    mockCollect.mockResolvedValue({
      rowsExamined: 1,
      candidates: [candidate],
      invalidReferences: [],
    });
    mockFindByRef.mockResolvedValue({
      id: "asset-existing",
      tenantSlug: "brightline",
    });

    const report = await runAssetBackfill({
      source: "brightline-portfolio",
      dryRun: false,
    });

    expect(report.alreadyRegistered).toBe(1);
    expect(report.registered).toBe(0);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("counts invalid references from collection", async () => {
    mockCollect.mockResolvedValue({
      rowsExamined: 1,
      candidates: [],
      invalidReferences: [
        { recordId: "img-bad", recordType: "PortfolioImage", message: "Empty storage reference." },
      ],
    });

    const report = await runAssetBackfill({
      source: "brightline-portfolio",
      dryRun: true,
    });

    expect(report.invalidReference).toBe(1);
    expect(report.examined).toBe(1);
  });

  it("skips missing storage when verify-storage is enabled", async () => {
    mockCollect.mockResolvedValue({
      rowsExamined: 1,
      candidates: [candidate],
      invalidReferences: [],
    });
    mockFindByRef.mockResolvedValue(null);
    mockHeadObject.mockResolvedValue(null);

    const report = await runAssetBackfill({
      source: "brightline-portfolio",
      dryRun: false,
      verifyStorage: true,
    });

    expect(report.missingStorageObjects).toBe(1);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("reports tenant conflicts on existing asset rows", async () => {
    mockCollect.mockResolvedValue({
      rowsExamined: 1,
      candidates: [candidate],
      invalidReferences: [],
    });
    mockFindByRef.mockResolvedValue({
      id: "asset-other",
      tenantSlug: "mirotech",
    });

    const report = await runAssetBackfill({
      source: "brightline-portfolio",
      dryRun: false,
    });

    expect(report.conflicts).toBe(1);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("respects limit via collection layer", async () => {
    mockCollect.mockResolvedValue({
      rowsExamined: 2,
      candidates: [candidate, { ...candidate, recordId: "img-2", objectKey: "portfolio/arc/b.webp" }],
      invalidReferences: [],
    });
    mockFindByRef.mockResolvedValue(null);

    await runAssetBackfill({
      source: "brightline-portfolio",
      dryRun: true,
      limit: 2,
    });

    expect(mockCollect).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 2 }),
      expect.anything()
    );
  });
});
