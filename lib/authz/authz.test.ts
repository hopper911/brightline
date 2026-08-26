/**
 * Authorization / boundary suite — gallery access, delivery packages, media keys,
 * upload MIME, contact validation. Prefer helper-level tests (stable in CI).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveDeliverablePackageItem } from "@/lib/client-api/delivery-package";
import { resolveClientAccessCode, hashAccessCode, verifyAccessCode } from "@/lib/client-access";
import { imageBelongsToGallery } from "@/lib/client-gallery-session";
import { contactSchema } from "@/lib/contact/schema";
import { findValidFinalPackageProject } from "@/lib/final-package-access";
import { isGalleryViewableByClient } from "@/lib/gallery-client-delivery";
import {
  isAdminSignableMediaKey,
  isAllowedPublicMediaKey,
  isPrivateMediaKey,
} from "@/lib/media-key-access";
import { prisma } from "@/lib/prisma";
import { FORBIDDEN_UPLOAD_CONTENT_TYPES } from "@/lib/truth/security";
import {
  isAllowedImageOrVideoUpload,
  normalizeUploadContentType,
} from "@/lib/upload-mime";
import { isAcceptedVideoFile } from "@/lib/video-port/keys";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    deliveryPackage: { findUnique: vi.fn() },
    deliveryPackageItem: { findFirst: vi.fn() },
    galleryAccessToken: { findMany: vi.fn(), findUnique: vi.fn() },
    workProject: { findUnique: vi.fn() },
  },
}));

const mockPkg = prisma.deliveryPackage.findUnique as ReturnType<typeof vi.fn>;
const mockItem = prisma.deliveryPackageItem.findFirst as ReturnType<typeof vi.fn>;
const mockAccessFindMany = prisma.galleryAccessToken.findMany as ReturnType<typeof vi.fn>;
const mockWorkProject = prisma.workProject.findUnique as ReturnType<typeof vi.fn>;

describe("authz — delivery package IDOR + expiry", () => {
  beforeEach(() => {
    mockPkg.mockReset();
    mockItem.mockReset();
  });

  it("rejects unknown package tokens without looking up items", async () => {
    mockPkg.mockResolvedValue(null);
    const r = await resolveDeliverablePackageItem("token-a", "item-from-b");
    expect(r).toEqual({ ok: false, status: 404 });
    expect(mockItem).not.toHaveBeenCalled();
  });

  it("rejects expired packages", async () => {
    mockPkg.mockResolvedValue({
      id: "pkg-a",
      expiresAt: new Date(Date.now() - 60_000),
    });
    const r = await resolveDeliverablePackageItem("expired-token", "item1");
    expect(r).toEqual({ ok: false, status: 404 });
    expect(mockItem).not.toHaveBeenCalled();
  });

  it("does not resolve items that belong to another package (IDOR)", async () => {
    mockPkg.mockResolvedValue({ id: "pkg-a", expiresAt: null });
    mockItem.mockResolvedValue(null);
    const r = await resolveDeliverablePackageItem("token-a", "item-owned-by-pkg-b");
    expect(r.ok).toBe(false);
    expect(mockItem).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "item-owned-by-pkg-b",
          deliveryPackageId: "pkg-a",
          selectedForDelivery: true,
        }),
      })
    );
  });
});

describe("authz — final-package expiry", () => {
  beforeEach(() => {
    mockWorkProject.mockReset();
  });

  it("rejects short / empty tokens", async () => {
    expect(await findValidFinalPackageProject("")).toBeNull();
    expect(await findValidFinalPackageProject("short")).toBeNull();
    expect(mockWorkProject).not.toHaveBeenCalled();
  });

  it("rejects expired final-package tokens", async () => {
    mockWorkProject.mockResolvedValue({
      id: "wp1",
      finalPackageToken: "a".repeat(24),
      finalPackageExpiresAt: new Date(Date.now() - 1000),
    });
    expect(await findValidFinalPackageProject("a".repeat(24))).toBeNull();
  });

  it("accepts unexpired final-package tokens", async () => {
    const project = {
      id: "wp1",
      finalPackageToken: "b".repeat(24),
      finalPackageExpiresAt: new Date(Date.now() + 86_400_000),
    };
    mockWorkProject.mockResolvedValue(project);
    expect(await findValidFinalPackageProject("b".repeat(24))).toEqual(project);
  });
});

describe("authz — gallery access codes (expiry / inactive / wrong gallery)", () => {
  beforeEach(() => {
    mockAccessFindMany.mockReset();
  });

  it("rejects empty codes", async () => {
    const r = await resolveClientAccessCode("   ");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/access code/i);
    expect(mockAccessFindMany).not.toHaveBeenCalled();
  });

  it("skips expired access tokens", async () => {
    const code = "ABCDEFGHJKLM";
    const hashed = hashAccessCode(code);
    mockAccessFindMany.mockResolvedValue([
      {
        id: "tok-expired",
        isActive: true,
        codeHint: hashed.hint,
        codeHash: hashed.hash,
        codeSalt: hashed.salt,
        expiresAt: new Date(Date.now() - 60_000),
        allowDownload: true,
        galleryId: "gal-a",
        gallery: {
          id: "gal-a",
          slug: "gal-a",
          title: "A",
          status: "SENT",
          galleryType: "PROOF",
        },
      },
    ]);
    const r = await resolveClientAccessCode(code);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("Invalid access code.");
  });

  it("does not match inactive tokens (query filters isActive)", async () => {
    mockAccessFindMany.mockResolvedValue([]);
    const r = await resolveClientAccessCode("ABCDEFGHJKLM");
    expect(r.ok).toBe(false);
    expect(mockAccessFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true, codeHint: expect.any(String) },
      })
    );
  });

  it("session A cannot claim images from gallery B", () => {
    const galleryA = { images: [{ id: "img-a1" }, { id: "img-a2" }] };
    expect(imageBelongsToGallery(galleryA, "img-a1")).toBe(true);
    expect(imageBelongsToGallery(galleryA, "img-from-gallery-b")).toBe(false);
  });

  it("blocks INTERNAL_REVIEW galleries from client view", () => {
    expect(
      isGalleryViewableByClient({ status: "SENT", galleryType: "INTERNAL_REVIEW" })
    ).toBe(false);
    expect(isGalleryViewableByClient({ status: "DRAFT", galleryType: "PROOF" })).toBe(false);
    expect(isGalleryViewableByClient({ status: "SENT", galleryType: "PROOF" })).toBe(true);
  });

  it("verifyAccessCode rejects wrong codes (client B cannot use client A hash)", () => {
    const a = hashAccessCode("AAAAAAAAAAAA");
    expect(verifyAccessCode("BBBBBBBBBBBB", a.hash, a.salt)).toBe(false);
    expect(verifyAccessCode("AAAAAAAAAAAA", a.hash, a.salt)).toBe(true);
  });
});

describe("authz — public cannot sign private media keys", () => {
  it("treats client gallery keys as private / not publicly allowlisted", () => {
    const key = "client-galleries/gallery-xyz/photo.jpg";
    expect(isPrivateMediaKey(key)).toBe(true);
    expect(isAllowedPublicMediaKey(key)).toBe(false);
  });

  it("rejects unknown vault prefixes for public and admin-signable paths", () => {
    expect(isAllowedPublicMediaKey("private-vault/secret.jpg")).toBe(false);
    expect(isAdminSignableMediaKey("private-vault/secret.jpg")).toBe(false);
  });
});

describe("authz — upload MIME (legacy + Image/Video Port)", () => {
  it("rejects forbidden content types", () => {
    for (const ct of FORBIDDEN_UPLOAD_CONTENT_TYPES) {
      expect(normalizeUploadContentType(ct)).toBeNull();
      expect(isAllowedImageOrVideoUpload(ct)).toBeNull();
    }
  });

  it("rejects HTML/SVG/script disguises and non-media types", () => {
    expect(normalizeUploadContentType("text/html")).toBeNull();
    expect(normalizeUploadContentType("image/svg+xml")).toBeNull();
    expect(normalizeUploadContentType("application/x-msdownload")).toBeNull();
    expect(normalizeUploadContentType("application/javascript")).toBeNull();
  });

  it("accepts JPEG/PNG/WebP and video/mp4 for image/video upload helpers", () => {
    expect(normalizeUploadContentType("image/jpeg")).toBe("image/jpeg");
    expect(normalizeUploadContentType("image/jpg")).toBe("image/jpeg");
    expect(isAllowedImageOrVideoUpload("image/webp")).toBe("image/webp");
    expect(isAllowedImageOrVideoUpload("video/mp4")).toBe("video/mp4");
    expect(isAllowedImageOrVideoUpload("application/pdf")).toBeNull();
  });

  it("Video Port rejects non-video uploads by MIME/extension", () => {
    expect(isAcceptedVideoFile({ name: "evil.html", type: "text/html" })).toBe(false);
    expect(isAcceptedVideoFile({ name: "photo.jpg", type: "image/jpeg" })).toBe(false);
    expect(isAcceptedVideoFile({ name: "clip.mp4", type: "video/mp4" })).toBe(true);
    expect(isAcceptedVideoFile({ name: "clip.mov", type: "" })).toBe(true);
  });
});

describe("authz — contact form Zod validation", () => {
  it("rejects missing / short fields", () => {
    expect(contactSchema.safeParse({}).success).toBe(false);
    expect(
      contactSchema.safeParse({ name: "A", email: "bad", message: "hi" }).success
    ).toBe(false);
    expect(
      contactSchema.safeParse({
        name: "Alex",
        email: "not-an-email",
        message: "Hello there",
      }).success
    ).toBe(false);
  });

  it("accepts a valid inquiry payload", () => {
    const parsed = contactSchema.safeParse({
      name: "Alex Rivera",
      email: "alex@example.com",
      message: "Looking for architecture photography in Jersey City.",
      company: "Studio Example",
    });
    expect(parsed.success).toBe(true);
  });
});
