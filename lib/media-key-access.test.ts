import { describe, expect, it } from "vitest";
import {
  isAdminSignableMediaKey,
  isAllowedPublicMediaKey,
  isPrivateMediaKey,
  isPublicMediaKey,
  isStudioReceiptKey,
} from "@/lib/media-key-access";

describe("media key access policy", () => {
  it("allows public marketing prefixes", () => {
    expect(isPublicMediaKey("portfolio/arc/web_full/foo.webp")).toBe(true);
    expect(isPublicMediaKey("mirotech/cor/web_video/cor-260826-01.mp4")).toBe(true);
    expect(isAllowedPublicMediaKey("site/blocks/hero.webp")).toBe(true);
  });

  it("treats client galleries as private", () => {
    expect(isPrivateMediaKey("client-galleries/gallery-123/photo.jpg")).toBe(true);
    expect(isAllowedPublicMediaKey("client-galleries/gallery-123/photo.jpg")).toBe(false);
  });

  it("rejects unknown prefixes", () => {
    expect(isPublicMediaKey("private-vault/secret.jpg")).toBe(false);
    expect(isPrivateMediaKey("private-vault/secret.jpg")).toBe(false);
    expect(isAdminSignableMediaKey("private-vault/secret.jpg")).toBe(false);
  });

  it("allows admin signable prefixes", () => {
    expect(isAdminSignableMediaKey("journal/import/waldo-01.jpg")).toBe(true);
    expect(isAdminSignableMediaKey("accounting/receipts/2024/01/file.pdf")).toBe(true);
    expect(isAdminSignableMediaKey("client-galleries/g1/photo.jpg")).toBe(true);
    expect(isAdminSignableMediaKey("tmp/image-port/arc/abc.jpg")).toBe(true);
    expect(isAdminSignableMediaKey("studio-os/receipts/2026/08/file.pdf")).toBe(true);
    expect(isPublicMediaKey("tmp/image-port/arc/abc.jpg")).toBe(false);
  });

  it("scopes studio receipt keys", () => {
    expect(isStudioReceiptKey("studio-os/receipts/2026/08/a.pdf")).toBe(true);
    expect(isStudioReceiptKey("studio-os/other/file.pdf")).toBe(false);
    expect(isStudioReceiptKey("../studio-os/receipts/a.pdf")).toBe(false);
    expect(isStudioReceiptKey("portfolio/arc/web_full/x.webp")).toBe(false);
  });
});
