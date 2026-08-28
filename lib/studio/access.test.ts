import { describe, expect, it } from "vitest";
import type { StudioOpsMembership } from "@/lib/studio/ops/types";
import {
  canReadBrightlineStudioContent,
  canReadMirotechStudioContent,
  canReadStudioMedia,
  canViewStudioPublishing,
  allowedPublishingTenants,
  allowedAuditTenants,
  canViewStudioActivity,
  canRetryPublishingJob,
  contentAdminEditHref,
  tenantRouteAllowed,
} from "@/lib/studio/access";

describe("studio access", () => {
  it("legacy admin bypasses permission checks", () => {
    expect(canReadBrightlineStudioContent([], true)).toBe(true);
    expect(canReadMirotechStudioContent([], true)).toBe(true);
    expect(canReadStudioMedia([], true)).toBe(true);
  });

  it("requires tenant-scoped permissions for platform users", () => {
    expect(canReadBrightlineStudioContent(["brightline.journal.read"], false)).toBe(true);
    expect(canReadBrightlineStudioContent(["mirotech.project.read"], false)).toBe(false);
    expect(canReadMirotechStudioContent(["mirotech.project.read"], false)).toBe(true);
    expect(canReadStudioMedia(["platform.media.read"], false)).toBe(true);
    expect(canReadStudioMedia(["brightline.journal.read"], false)).toBe(false);
  });

  it("enforces tenant route match", () => {
    expect(tenantRouteAllowed("brightline", "brightline")).toBe(true);
    expect(tenantRouteAllowed("brightline", "mirotech")).toBe(false);
  });

  it("maps content types to existing admin editors", () => {
    expect(contentAdminEditHref("brightline", "work-project", "abc")).toBe("/admin/work/abc");
    expect(contentAdminEditHref("mirotech", "dual-brand-work", "hub-1")).toBe(
      "/admin/studio-cms/hub-1"
    );
  });

  it("gates publishing visibility by publish permissions", () => {
    expect(canViewStudioPublishing(["brightline.journal.publish"], false)).toBe(true);
    expect(canViewStudioPublishing(["brightline.journal.read"], false)).toBe(false);
    expect(
      allowedPublishingTenants(
        ["brightline.journal.publish"],
        false,
        [{ tenantSlug: "brightline", role: "EDITOR" } satisfies StudioOpsMembership]
      )
    ).toEqual(["brightline"]);
  });

  it("allows retry only with tenant publish permission", () => {
    expect(canRetryPublishingJob("brightline", ["brightline.journal.publish"], false)).toBe(true);
    expect(canRetryPublishingJob("mirotech", ["brightline.journal.publish"], false)).toBe(false);
  });

  it("scopes audit tenants by role permissions", () => {
    const tenants = allowedAuditTenants(
      [],
      false,
      [
        { tenantSlug: "brightline", role: "ADMIN" },
        { tenantSlug: "mirotech", role: "VIEWER" },
      ]
    );
    expect(tenants).toEqual(["brightline"]);
    expect(canViewStudioActivity([], false, [{ tenantSlug: "mirotech", role: "VIEWER" }])).toBe(
      false
    );
  });
});
