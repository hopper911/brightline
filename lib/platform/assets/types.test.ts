import { describe, expect, it } from "vitest";
import {
  isMediaObjectRef,
  isMediaReferenceWithAssetId,
  mediaVisibilityToPlatformAssetVisibility,
  platformAssetVisibilityToMediaVisibility,
} from "@/lib/platform/assets/types";

describe("platform asset types", () => {
  it("maps media visibility to platform asset visibility", () => {
    expect(mediaVisibilityToPlatformAssetVisibility("public")).toBe("PUBLIC");
    expect(mediaVisibilityToPlatformAssetVisibility("private")).toBe("PRIVATE");
    expect(mediaVisibilityToPlatformAssetVisibility("admin")).toBe("PRIVATE");
  });

  it("maps platform visibility back to media visibility", () => {
    expect(platformAssetVisibilityToMediaVisibility("PUBLIC")).toBe("public");
    expect(platformAssetVisibilityToMediaVisibility("PRIVATE")).toBe("private");
  });

  it("detects reference shapes", () => {
    expect(isMediaReferenceWithAssetId({ assetId: "asset-1" })).toBe(true);
    expect(isMediaObjectRef({ vault: "brightline", objectKey: "site/x.jpg" })).toBe(true);
  });
});
