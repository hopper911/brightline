import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { MediaService } from "@/lib/platform/media/media-service";
import { createSiteBackgroundUploadUrlViaMediaService } from "@/lib/platform/media/integrations/site-background-upload-url";
import { createPortfolioPublicUploadUrlViaMediaService } from "@/lib/platform/media/integrations/portfolio-public-upload-url";

describe("Phase 3D upload URL integrations", () => {
  const service: MediaService = {
    createUpload: vi.fn(),
    getAssetUrl: vi.fn(),
    createDownloadUrl: vi.fn(),
    exists: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(service.createUpload).mockReset();
  });

  it("maps site-background upload to legacy response shape (private PUT)", async () => {
    vi.mocked(service.createUpload).mockResolvedValue({
      kind: "signed-upload",
      uploadUrl: "https://signed.example/put",
      expiresInSeconds: 3600,
      headers: {},
      object: { vault: "brightline", objectKey: "site/backgrounds/full/1-a.mp4" },
    });

    const result = await createSiteBackgroundUploadUrlViaMediaService(service, {
      objectKey: "site/backgrounds/full/1-a.mp4",
      contentType: "video/mp4",
    });

    expect(result).toEqual({
      ok: true,
      key: "site/backgrounds/full/1-a.mp4",
      uploadUrl: "https://signed.example/put",
      headers: {},
      expiresIn: 3600,
    });
    expect(service.createUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        visibility: "private",
        object: { vault: "brightline", objectKey: "site/backgrounds/full/1-a.mp4" },
      })
    );
  });

  it("maps portfolio-public upload to legacy response shape", async () => {
    vi.mocked(service.createUpload).mockResolvedValue({
      kind: "signed-upload",
      uploadUrl: "https://signed.example/put",
      expiresInSeconds: 3600,
      headers: { "x-test": "1" },
      object: { vault: "brightline", objectKey: "portfolio-public/1-abc.jpg" },
    });

    const result = await createPortfolioPublicUploadUrlViaMediaService(service, {
      objectKey: "portfolio-public/1-abc.jpg",
      contentType: "image/jpeg",
    });

    expect(result).toEqual({
      ok: true,
      url: "https://signed.example/put",
      headers: { "x-test": "1" },
    });
  });
});
