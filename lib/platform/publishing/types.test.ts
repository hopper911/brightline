import { describe, expect, it } from "vitest";
import {
  assertValidPublishRequest,
  isPublishOperation,
  isPublishTargetId,
  publishRequestFromLegacyTarget,
  publishTargetForTenant,
  PUBLISH_TARGET_TENANT,
} from "@/lib/platform/publishing/types";

describe("platform publishing types", () => {
  it("validates publish targets and tenant mapping", () => {
    expect(isPublishTargetId("brightline-site")).toBe(true);
    expect(isPublishTargetId("mirotech-site")).toBe(true);
    expect(isPublishTargetId("vercel")).toBe(false);
    expect(PUBLISH_TARGET_TENANT["brightline-site"]).toBe("brightline");
    expect(publishTargetForTenant("mirotech")).toBe("mirotech-site");
  });

  it("validates publish operations", () => {
    expect(isPublishOperation("publish")).toBe(true);
    expect(isPublishOperation("sync")).toBe(true);
    expect(isPublishOperation("deploy")).toBe(false);
  });

  it("builds PublishRequest from legacy PlatformPublishTarget", () => {
    const request = publishRequestFromLegacyTarget(
      { tenantSlug: "brightline", entityType: "work-project", entityId: "wp-1" },
      "unpublish"
    );
    expect(request).toEqual({
      source: { tenant: "brightline", type: "work-project", id: "wp-1" },
      target: "brightline-site",
      operation: "unpublish",
    });
  });

  it("assertValidPublishRequest rejects invalid target", () => {
    expect(() =>
      assertValidPublishRequest({
        source: { tenant: "brightline", type: "work-project", id: "wp-1" },
        target: "invalid" as "brightline-site",
        operation: "publish",
      })
    ).toThrow(/Invalid publish target/);
  });
});
