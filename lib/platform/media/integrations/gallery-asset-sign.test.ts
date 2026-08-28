import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { MediaService } from "@/lib/platform/media/media-service";
import { signGalleryAssetViaMediaService } from "@/lib/platform/media/integrations/gallery-asset-sign";

describe("signGalleryAssetViaMediaService", () => {
  const service: MediaService = {
    createUpload: vi.fn(),
    getAssetUrl: vi.fn(),
    createDownloadUrl: vi.fn(),
    exists: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(service.createDownloadUrl).mockReset();
  });

  it("maps createDownloadUrl to legacy signGalleryAsset shape", async () => {
    vi.mocked(service.createDownloadUrl).mockResolvedValue({
      kind: "signed-read",
      url: "https://signed.example/gallery.jpg",
      expiresInSeconds: 3600,
    });

    const result = await signGalleryAssetViaMediaService(service, {
      objectKey: "client-galleries/g1/low-res/img.jpg",
    });

    expect(result).toEqual({
      url: "https://signed.example/gallery.jpg",
      expiresIn: 3600,
    });
    expect(service.createDownloadUrl).toHaveBeenCalledWith(
      expect.objectContaining({ tenant: expect.objectContaining({ slug: "brightline" }) }),
      { vault: "brightline", objectKey: "client-galleries/g1/low-res/img.jpg" },
      { expiresInSeconds: 3600 }
    );
  });

  it("honors custom expiry", async () => {
    vi.mocked(service.createDownloadUrl).mockResolvedValue({
      kind: "signed-read",
      url: "https://signed.example/x.jpg",
      expiresInSeconds: 600,
    });

    await signGalleryAssetViaMediaService(service, {
      objectKey: "client-galleries/g1/photo.jpg",
      expiresInSeconds: 600,
    });

    expect(service.createDownloadUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { expiresInSeconds: 600 }
    );
  });
});
