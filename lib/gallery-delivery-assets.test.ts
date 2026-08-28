import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const ENV_KEY = "PLATFORM_MEDIA_ENABLED";

vi.mock("@/lib/storage-r2", () => ({
  signGet: vi.fn(),
  getObjectBuffer: vi.fn(),
  putObjectBuffer: vi.fn(),
}));

vi.mock("@/lib/platform/features", () => ({
  isPlatformFeatureEnabled: vi.fn(),
}));

vi.mock("@/lib/platform/media/server", () => ({
  defaultMediaService: {
    createDownloadUrl: vi.fn(),
  },
}));

import { signGet } from "@/lib/storage-r2";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import { defaultMediaService } from "@/lib/platform/media/server";
import { signGalleryAsset } from "@/lib/gallery-delivery-assets";

const mockSignGet = signGet as ReturnType<typeof vi.fn>;
const mockFlag = isPlatformFeatureEnabled as ReturnType<typeof vi.fn>;
const mockCreateDownloadUrl = defaultMediaService.createDownloadUrl as ReturnType<typeof vi.fn>;

describe("signGalleryAsset", () => {
  beforeEach(() => {
    mockSignGet.mockReset();
    mockFlag.mockReset();
    mockCreateDownloadUrl.mockReset();
    delete process.env[ENV_KEY];
  });

  it("returns null when key is empty", async () => {
    expect(await signGalleryAsset(null)).toBeNull();
    expect(await signGalleryAsset("")).toBeNull();
  });

  it("uses legacy signGet when platform media is disabled", async () => {
    mockFlag.mockReturnValue(false);
    mockSignGet.mockResolvedValue({ url: "https://legacy.example/a.jpg", expiresIn: 3600 });

    const result = await signGalleryAsset("client-galleries/g1/a.jpg");

    expect(result).toEqual({ url: "https://legacy.example/a.jpg", expiresIn: 3600 });
    expect(mockSignGet).toHaveBeenCalledWith({
      key: "client-galleries/g1/a.jpg",
      expiresIn: 3600,
    });
    expect(mockCreateDownloadUrl).not.toHaveBeenCalled();
  });

  it("uses MediaService when platform media is enabled", async () => {
    mockFlag.mockReturnValue(true);
    mockCreateDownloadUrl.mockResolvedValue({
      kind: "signed-read",
      url: "https://platform.example/a.jpg",
      expiresInSeconds: 3600,
    });

    const result = await signGalleryAsset("client-galleries/g1/a.jpg", 3600);

    expect(result).toEqual({ url: "https://platform.example/a.jpg", expiresIn: 3600 });
    expect(mockCreateDownloadUrl).toHaveBeenCalled();
    expect(mockSignGet).not.toHaveBeenCalled();
  });
});
