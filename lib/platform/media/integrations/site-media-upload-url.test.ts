import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/r2", () => ({
  getPublicR2Url: (key: string) => `/api/media/public?key=${encodeURIComponent(key)}`,
}));

import { MediaConfigurationError, MediaUploadError } from "@/lib/platform/media/errors";
import type { MediaService } from "@/lib/platform/media/media-service";
import {
  createSiteMediaUploadUrlViaMediaService,
  siteMediaUploadUrlErrorMessage,
} from "@/lib/platform/media/integrations/site-media-upload-url";

describe("createSiteMediaUploadUrlViaMediaService", () => {
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
    vi.mocked(service.createUpload).mockReset();
  });

  it("maps MediaService signed upload to legacy response shape", async () => {
    vi.mocked(service.createUpload).mockResolvedValue({
      kind: "signed-upload",
      uploadUrl: "https://signed.example/put",
      expiresInSeconds: 3600,
      headers: { "x-amz-acl": "public-read" },
      object: { vault: "brightline", objectKey: "site/pages/1-hero.jpg" },
    });

    const result = await createSiteMediaUploadUrlViaMediaService(service, {
      objectKey: "site/pages/1-hero.jpg",
      contentType: "image/jpeg",
    });

    expect(result).toEqual({
      ok: true,
      url: "https://signed.example/put",
      headers: { "x-amz-acl": "public-read" },
      key: "site/pages/1-hero.jpg",
      publicUrl: "/api/media/public?key=site%2Fpages%2F1-hero.jpg",
    });

    expect(service.createUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        object: { vault: "brightline", objectKey: "site/pages/1-hero.jpg" },
        contentType: "image/jpeg",
        visibility: "public",
      })
    );
  });

  it("returns safe error messages without AWS details", () => {
    expect(siteMediaUploadUrlErrorMessage(new MediaUploadError("AccessDenied: secret"))).toBe(
      "Could not prepare upload."
    );
    expect(
      siteMediaUploadUrlErrorMessage(new MediaConfigurationError("R2_SECRET missing"))
    ).toBe("Media storage is not configured.");
    expect(siteMediaUploadUrlErrorMessage(new Error("NetworkFailure"))).toBe(
      "Could not prepare upload."
    );
  });
});
