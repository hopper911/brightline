import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { MediaService } from "@/lib/platform/media/media-service";
import { createMirotechCmsUploadUrlViaMediaService } from "@/lib/platform/media/integrations/mirotech-cms-upload-url";
import { createMirotechCmsSignRedirectUrl } from "@/lib/platform/media/integrations/mirotech-cms-sign";
import { headMirotechCmsObjectViaMediaService } from "@/lib/platform/media/integrations/mirotech-cms-head";

describe("Phase 3F Mirotech CMS media integrations", () => {
  const service: MediaService = {
    createUpload: vi.fn(),
    getAssetUrl: vi.fn(),
    createDownloadUrl: vi.fn(),
    exists: vi.fn(),
    headObject: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(service.createUpload).mockReset();
    vi.mocked(service.createDownloadUrl).mockReset();
    vi.mocked(service.headObject).mockReset();
  });

  it("maps Mirotech CMS upload to legacy response shape", async () => {
    vi.mocked(service.createUpload).mockResolvedValue({
      kind: "signed-upload",
      uploadUrl: "https://signed.example/put",
      expiresInSeconds: 900,
      headers: { "x-amz-acl": "public-read" },
      object: { vault: "mirotech-site", objectKey: "projects/foo/hero.webp" },
    });

    const result = await createMirotechCmsUploadUrlViaMediaService(service, {
      objectKey: "projects/foo/hero.webp",
      contentType: "image/webp",
      access: "public-read",
      expiresInSeconds: 900,
    });

    expect(result).toEqual({
      ok: true,
      key: "projects/foo/hero.webp",
      uploadUrl: "https://signed.example/put",
      headers: { "x-amz-acl": "public-read" },
      expiresIn: 900,
      access: "public-read",
      vault: "mirotech-site",
    });
    expect(service.createUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({ tenant: expect.objectContaining({ slug: "mirotech" }) }),
        object: { vault: "mirotech-site", objectKey: "projects/foo/hero.webp" },
        visibility: "public",
      })
    );
  });

  it("creates Mirotech CMS admin sign redirect URL", async () => {
    vi.mocked(service.createDownloadUrl).mockResolvedValue({
      kind: "signed-read",
      url: "https://signed.example/get",
      expiresInSeconds: 900,
    });

    const url = await createMirotechCmsSignRedirectUrl(service, "site/backgrounds/web/a.jpg");

    expect(url).toBe("https://signed.example/get");
    expect(service.createDownloadUrl).toHaveBeenCalledWith(
      expect.objectContaining({ tenant: expect.objectContaining({ slug: "mirotech" }) }),
      { vault: "mirotech-site", objectKey: "site/backgrounds/web/a.jpg" },
      { expiresInSeconds: 900 }
    );
  });

  it("heads mirotech-site CMS objects with mirotech tenant context", async () => {
    vi.mocked(service.headObject).mockResolvedValue({
      size: 1234,
      lastModified: "2026-01-01T00:00:00.000Z",
      contentType: "image/webp",
    });

    const head = await headMirotechCmsObjectViaMediaService(service, {
      key: "journal/post/hero.webp",
      vault: "mirotech-site",
    });

    expect(head?.size).toBe(1234);
    expect(service.headObject).toHaveBeenCalledWith(
      expect.objectContaining({ tenant: expect.objectContaining({ slug: "mirotech" }) }),
      { vault: "mirotech-site", objectKey: "journal/post/hero.webp" }
    );
  });

  it("returns null for non-mirotech-site vault refs", async () => {
    const head = await headMirotechCmsObjectViaMediaService(service, {
      key: "mirotech/product/web_full/a.webp",
      vault: "brightline",
    });
    expect(head).toBeNull();
    expect(service.headObject).not.toHaveBeenCalled();
  });
});
