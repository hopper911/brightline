import { describe, expect, it } from "vitest";
import {
  ALL_PLATFORM_PERMISSIONS,
  isPlatformPermission,
  permissionTenantScope,
} from "@/lib/platform/authorization/permissions";

describe("platform permissions catalog", () => {
  it("has stable unique identifiers", () => {
    const set = new Set(ALL_PLATFORM_PERMISSIONS);
    expect(set.size).toBe(ALL_PLATFORM_PERMISSIONS.length);
    expect(ALL_PLATFORM_PERMISSIONS.length).toBeGreaterThanOrEqual(18);
  });

  it("validates permission strings", () => {
    expect(isPlatformPermission("brightline.gallery.read")).toBe(true);
    expect(isPlatformPermission("not.a.permission")).toBe(false);
  });

  it("derives tenant scope from prefix", () => {
    expect(permissionTenantScope("brightline.gallery.read")).toBe("brightline");
    expect(permissionTenantScope("mirotech.project.write")).toBe("mirotech");
    expect(permissionTenantScope("platform.media.read")).toBe("platform");
  });
});
