import { describe, expect, it, vi } from "vitest";
import {
  PlatformAssetNotFoundError,
  resolveMediaReferenceToObjectRef,
} from "@/lib/platform/assets/resolve-reference";
import type { PlatformAssetRecord } from "@/lib/platform/assets/types";

const sampleAsset: PlatformAssetRecord = {
  id: "asset-1",
  tenantId: "tenant-1",
  tenantSlug: "brightline",
  provider: "R2",
  vault: "brightline",
  bucket: "brightline-prod",
  objectKey: "site/pages/hero.jpg",
  filename: "hero.jpg",
  mimeType: "image/jpeg",
  visibility: "PUBLIC",
  metadata: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("resolveMediaReferenceToObjectRef", () => {
  it("passes through legacy MediaObjectRef unchanged", async () => {
    const result = await resolveMediaReferenceToObjectRef(
      { vault: "brightline", objectKey: "portfolio/a.jpg" },
      vi.fn()
    );
    expect(result).toEqual({ vault: "brightline", objectKey: "portfolio/a.jpg" });
  });

  it("resolves asset id to storage object", async () => {
    const lookup = vi.fn().mockResolvedValue(sampleAsset);
    const result = await resolveMediaReferenceToObjectRef({ assetId: "asset-1" }, lookup);
    expect(result).toEqual({ vault: "brightline", objectKey: "site/pages/hero.jpg" });
  });

  it("throws when asset id is unknown", async () => {
    await expect(
      resolveMediaReferenceToObjectRef({ assetId: "missing" }, vi.fn().mockResolvedValue(null))
    ).rejects.toBeInstanceOf(PlatformAssetNotFoundError);
  });
});
