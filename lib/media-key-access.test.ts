import { describe, expect, it } from "vitest";
import {
  isAllowedPublicMediaKey,
  isPrivateMediaKey,
  isPublicMediaKey,
} from "@/lib/media-key-access";

describe("media key access policy", () => {
  it("allows public marketing prefixes", () => {
    expect(isPublicMediaKey("portfolio/arc/web_full/foo.webp")).toBe(true);
    expect(isAllowedPublicMediaKey("site/blocks/hero.webp")).toBe(true);
  });

  it("treats client galleries as private", () => {
    expect(isPrivateMediaKey("client-galleries/gallery-123/photo.jpg")).toBe(true);
    expect(isAllowedPublicMediaKey("client-galleries/gallery-123/photo.jpg")).toBe(false);
  });

  it("rejects unknown prefixes", () => {
    expect(isPublicMediaKey("private-vault/secret.jpg")).toBe(false);
    expect(isPrivateMediaKey("private-vault/secret.jpg")).toBe(false);
  });
});
