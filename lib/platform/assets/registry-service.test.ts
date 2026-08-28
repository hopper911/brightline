import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { mockUpsert, mockAudit } = vi.hoisted(() => ({
  mockUpsert: vi.fn(),
  mockAudit: vi.fn(),
}));

vi.mock("@/lib/platform/assets/repository", () => ({
  upsertPlatformAssetFromStorageRef: mockUpsert,
  findPlatformAssetById: vi.fn(),
  findPlatformAssetByStorageRef: vi.fn(),
}));

vi.mock("@/lib/platform/tenants/repository", () => ({
  ensurePlatformTenant: vi.fn().mockResolvedValue({ id: "tenant-brightline", slug: "brightline" }),
}));

vi.mock("@/lib/platform/media/resolve-bucket", () => ({
  resolveMediaBucket: vi.fn().mockReturnValue("brightline-prod"),
}));

vi.mock("@/lib/platform/audit/record-safely", () => ({
  recordAuditSafely: mockAudit,
}));

import { PlatformAssetRegistryService } from "@/lib/platform/assets/registry-service";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";

const ENV_KEY = "PLATFORM_ASSET_REGISTRY_ENABLED";

describe("PlatformAssetRegistryService", () => {
  const service = new PlatformAssetRegistryService();
  const context = createPlatformContextForTenant("brightline");
  const savedEnv = process.env[ENV_KEY];

  beforeEach(() => {
    mockUpsert.mockReset();
    mockAudit.mockReset();
    process.env[ENV_KEY] = "true";
  });

  afterEach(() => {
    if (savedEnv === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = savedEnv;
  });

  it("skips registration when flag is disabled", async () => {
    process.env[ENV_KEY] = "false";
    const result = await service.register(context, {
      object: { vault: "brightline", objectKey: "site/a.jpg" },
    });
    expect(result).toEqual({ ok: true, skipped: true, reason: "disabled" });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("creates registry row and audits asset.registered", async () => {
    mockUpsert.mockResolvedValue({
      created: true,
      asset: {
        id: "asset-new",
        tenantId: "tenant-brightline",
        tenantSlug: "brightline",
        provider: "R2",
        vault: "brightline",
        bucket: "brightline-prod",
        objectKey: "site/a.jpg",
        filename: null,
        mimeType: "image/jpeg",
        visibility: "PRIVATE",
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const result = await service.register(context, {
      object: { vault: "brightline", objectKey: "site/a.jpg" },
      mimeType: "image/jpeg",
      visibility: "private",
    });

    expect(result.ok).toBe(true);
    if (result.ok && !result.skipped) {
      expect(result.created).toBe(true);
      expect(result.asset.id).toBe("asset-new");
    }
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "asset.registered", resource: { type: "platform_asset", id: "asset-new" } })
    );
  });

  it("does not fail uploads on registry error when not strict", async () => {
    mockUpsert.mockRejectedValue(new Error("DB unavailable"));
    const result = await service.register(context, {
      object: { vault: "brightline", objectKey: "site/a.jpg" },
    });
    expect(result).toEqual({
      ok: true,
      skipped: true,
      reason: "failed",
      error: "DB unavailable",
    });
  });
});
