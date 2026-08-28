import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/storage-r2", () => ({
  signPut: vi.fn(),
  signGet: vi.fn(),
  headObject: vi.fn(),
}));

import { R2MediaProvider } from "@/lib/platform/media/r2-media-provider";
import { headObject, signGet, signPut } from "@/lib/storage-r2";

const mockSignPut = signPut as ReturnType<typeof vi.fn>;
const mockSignGet = signGet as ReturnType<typeof vi.fn>;
const mockHeadObject = headObject as ReturnType<typeof vi.fn>;

describe("R2MediaProvider", () => {
  const provider = new R2MediaProvider();

  beforeEach(() => {
    mockSignPut.mockReset();
    mockSignGet.mockReset();
    mockHeadObject.mockReset();
  });

  it("maps signPut to storage-r2 with vault and key unchanged", async () => {
    mockSignPut.mockResolvedValue({
      url: "https://put.example",
      expiresIn: 3600,
      headers: {},
    });

    const result = await provider.signPut({
      object: { vault: "brightline", objectKey: "portfolio/cor/web_full/x.webp" },
      contentType: "image/webp",
      expiresInSeconds: 900,
      access: "private",
    });

    expect(mockSignPut).toHaveBeenCalledWith({
      key: "portfolio/cor/web_full/x.webp",
      contentType: "image/webp",
      expiresIn: 900,
      access: "private",
      vault: "brightline",
    });
    expect(result.kind).toBe("signed-upload");
    expect(result.expiresInSeconds).toBe(3600);
  });

  it("returns null head result for missing objects", async () => {
    mockHeadObject.mockRejectedValue(Object.assign(new Error("Not Found"), { name: "NotFound" }));

    const result = await provider.headObject({
      vault: "brightline",
      objectKey: "portfolio/missing.webp",
    });

    expect(result).toBeNull();
  });

  it("normalizes signGet failures", async () => {
    mockSignGet.mockRejectedValue(new Error("R2 credentials not configured"));

    await expect(
      provider.signGet({
        object: { vault: "brightline", objectKey: "delivery/pkg/file.zip" },
      })
    ).rejects.toMatchObject({ code: "configuration" });
  });

  it("exists returns false when headObject is null", async () => {
    mockHeadObject.mockRejectedValue(Object.assign(new Error("NoSuchKey"), { name: "NoSuchKey" }));

    const exists = await provider.exists({
      vault: "mirotech-site",
      objectKey: "projects/a/hero.webp",
    });

    expect(exists).toBe(false);
  });

  it("rejects invalid keys before calling storage", async () => {
    await expect(
      provider.signPut({
        object: { vault: "brightline", objectKey: "../escape" },
        contentType: "image/jpeg",
      })
    ).rejects.toMatchObject({ code: "upload" });

    expect(mockSignPut).not.toHaveBeenCalled();
  });
});

describe("normalize not found", () => {
  it("headObject not found does not throw MediaNotFoundError for exists path", async () => {
    const provider = new R2MediaProvider();
    mockHeadObject.mockRejectedValue(
      Object.assign(new Error("not found"), { $metadata: { httpStatusCode: 404 } })
    );
    await expect(
      provider.exists({ vault: "brightline", objectKey: "site/x.jpg" })
    ).resolves.toBe(false);
  });
});
