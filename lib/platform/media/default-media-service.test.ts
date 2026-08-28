import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("server-only", () => ({}));

import { DefaultMediaService } from "@/lib/platform/media/default-media-service";
import type { MediaProvider } from "@/lib/platform/media/media-provider";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";

describe("DefaultMediaService", () => {
  const provider: MediaProvider = {
    signPut: vi.fn(),
    signGet: vi.fn(),
    headObject: vi.fn(),
    exists: vi.fn(),
  };

  const registry = {
    findById: vi.fn(),
    findByStorageRef: vi.fn(),
    register: vi.fn(),
  };

  const service = new DefaultMediaService(provider, registry as never);
  const context = createPlatformContextForTenant("brightline");

  beforeEach(() => {
    vi.mocked(provider.signPut).mockReset();
    vi.mocked(provider.signGet).mockReset();
    vi.mocked(provider.exists).mockReset();
    vi.mocked(provider.headObject).mockReset();
  });

  it("maps public upload to public-read access", async () => {
    vi.mocked(provider.signPut).mockResolvedValue({
      kind: "signed-upload",
      uploadUrl: "https://upload.example",
      expiresInSeconds: 3600,
      object: { vault: "brightline", objectKey: "portfolio/arc/web_full/a.webp" },
    });

    await service.createUpload({
      context,
      object: { vault: "brightline", objectKey: "portfolio/arc/web_full/a.webp" },
      contentType: "image/webp",
      visibility: "public",
    });

    expect(provider.signPut).toHaveBeenCalledWith(
      expect.objectContaining({ access: "public-read" })
    );
  });

  it("returns public delivery URL for allowlisted brightline keys", async () => {
    const result = await service.getAssetUrl(context, {
      vault: "brightline",
      objectKey: "portfolio/arc/web_full/a.webp",
    });

    expect(result.kind).toBe("public-delivery");
    if (result.kind === "public-delivery") {
      expect(result.url).toContain("/api/media/public?key=");
    }
    expect(provider.signGet).not.toHaveBeenCalled();
  });

  it("returns signed read for private keys", async () => {
    vi.mocked(provider.signGet).mockResolvedValue({
      kind: "signed-read",
      url: "https://signed.example/get",
      expiresInSeconds: 3600,
    });

    const result = await service.getAssetUrl(context, {
      vault: "brightline",
      objectKey: "client-galleries/g1/photo.jpg",
    });

    expect(result.kind).toBe("signed-read");
    expect(provider.signGet).toHaveBeenCalled();
  });

  it("propagates tenant context without rewriting object keys", async () => {
    vi.mocked(provider.exists).mockResolvedValue(true);
    const mirotechContext = createPlatformContextForTenant("mirotech");

    await service.exists(mirotechContext, {
      vault: "mirotech-site",
      objectKey: "projects/foo/hero.webp",
    });

    expect(provider.exists).toHaveBeenCalledWith({
      vault: "mirotech-site",
      objectKey: "projects/foo/hero.webp",
    });
  });

  it("delegates headObject to provider without rewriting keys", async () => {
    vi.mocked(provider.headObject).mockResolvedValue({
      size: 99,
      lastModified: "2026-01-01T00:00:00.000Z",
    });
    const mirotechContext = createPlatformContextForTenant("mirotech");

    const head = await service.headObject(mirotechContext, {
      vault: "mirotech-site",
      objectKey: "projects/foo/hero.webp",
    });

    expect(head?.size).toBe(99);
    expect(provider.headObject).toHaveBeenCalledWith({
      vault: "mirotech-site",
      objectKey: "projects/foo/hero.webp",
    });
  });

  it("resolves asset id references through registry", async () => {
    vi.mocked(registry.findById).mockResolvedValue({
      id: "asset-1",
      tenantId: "t1",
      tenantSlug: "brightline",
      provider: "R2",
      vault: "brightline",
      bucket: "b1",
      objectKey: "site/x.jpg",
      filename: null,
      mimeType: null,
      visibility: "PUBLIC",
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.resolveToObjectRef(context, { assetId: "asset-1" });
    expect(result).toEqual({ vault: "brightline", objectKey: "site/x.jpg" });
  });

  it("delegates registerAsset to registry", async () => {
    vi.mocked(registry.register).mockResolvedValue({ ok: true, skipped: true, reason: "disabled" });
    await service.registerAsset(context, {
      object: { vault: "brightline", objectKey: "site/x.jpg" },
    });
    expect(registry.register).toHaveBeenCalled();
  });
});
