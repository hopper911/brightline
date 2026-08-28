import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/storage-r2-public", () => ({
  signPublicR2Get: vi.fn(),
}));

import { signPublicR2Get } from "@/lib/storage-r2-public";
import type { MediaService } from "@/lib/platform/media/media-service";
import { createAdminMediaSignRedirectUrl } from "@/lib/platform/media/integrations/admin-media-sign";

const mockSignPublicR2Get = signPublicR2Get as ReturnType<typeof vi.fn>;

describe("createAdminMediaSignRedirectUrl", () => {
  const service: MediaService = {
    createUpload: vi.fn(),
    getAssetUrl: vi.fn(),
    createDownloadUrl: vi.fn(),
    exists: vi.fn(),
    headObject: vi.fn(),
    resolveToObjectRef: vi.fn(),
    registerAsset: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(service.createDownloadUrl).mockReset();
    mockSignPublicR2Get.mockReset();
  });

  it("uses signPublicR2Get for public-prefix keys", async () => {
    mockSignPublicR2Get.mockResolvedValue({
      url: "https://public-presigned.example/site/x.jpg",
      expiresIn: 300,
    });

    const url = await createAdminMediaSignRedirectUrl(service, "site/pages/hero.jpg");

    expect(url).toBe("https://public-presigned.example/site/x.jpg");
    expect(mockSignPublicR2Get).toHaveBeenCalledWith({
      key: "site/pages/hero.jpg",
      expiresIn: 300,
    });
    expect(service.createDownloadUrl).not.toHaveBeenCalled();
  });

  it("uses MediaService createDownloadUrl for private-prefix keys", async () => {
    vi.mocked(service.createDownloadUrl).mockResolvedValue({
      kind: "signed-read",
      url: "https://private-presigned.example/gallery/x.jpg",
      expiresInSeconds: 300,
    });

    const url = await createAdminMediaSignRedirectUrl(
      service,
      "client-galleries/g1/photo.jpg"
    );

    expect(url).toBe("https://private-presigned.example/gallery/x.jpg");
    expect(service.createDownloadUrl).toHaveBeenCalledWith(
      expect.objectContaining({ tenant: expect.objectContaining({ slug: "brightline" }) }),
      { vault: "brightline", objectKey: "client-galleries/g1/photo.jpg" },
      { expiresInSeconds: 300 }
    );
  });
});
