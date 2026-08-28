import { describe, expect, it } from "vitest";
import {
  assertValidContentRef,
  contentRefFromPlatformLegacy,
  contentRefKey,
  isContentRef,
  isCrossPublishedContentType,
  platformContentRefFromContentRef,
  tenantOwnsContentType,
} from "@/lib/platform/content/types";

describe("platform content types", () => {
  it("validates ContentRef shape and tenant requirement", () => {
    expect(
      isContentRef({ tenant: "brightline", type: "work-project", id: "wp_1" })
    ).toBe(true);
    expect(isContentRef({ tenant: "brightline", type: "work-project", id: "  " })).toBe(false);
    expect(isContentRef({ tenant: "unknown", type: "work-project", id: "x" })).toBe(false);
    expect(isContentRef({ type: "work-project", id: "x" })).toBe(false);
  });

  it("builds stable content ref keys", () => {
    const ref = assertValidContentRef({
      tenant: "mirotech",
      type: "dual-brand-work",
      id: "hub-abc",
    });
    expect(contentRefKey(ref)).toBe("mirotech:dual-brand-work:hub-abc");
  });

  it("maps legacy PlatformContentRef", () => {
    const ref = contentRefFromPlatformLegacy({
      tenantSlug: "brightline",
      entityType: "blog-post",
      entityId: "post-1",
    });
    expect(ref).toEqual({ tenant: "brightline", type: "blog-post", id: "post-1" });
    expect(
      platformContentRefFromContentRef({
        tenant: "brightline",
        type: "blog-post",
        id: "post-1",
      })
    ).toEqual({
      tenantSlug: "brightline",
      entityType: "blog-post",
      entityId: "post-1",
    });
  });

  it("classifies tenant ownership and cross-published types", () => {
    expect(tenantOwnsContentType("brightline", "work-project")).toBe(true);
    expect(tenantOwnsContentType("mirotech", "work-project")).toBe(false);
    expect(tenantOwnsContentType("mirotech", "mirotech-journal")).toBe(true);
    expect(tenantOwnsContentType("brightline", "dual-brand-work")).toBe(true);
    expect(isCrossPublishedContentType("dual-brand-journal")).toBe(true);
    expect(isCrossPublishedContentType("work-project")).toBe(false);
  });
});
