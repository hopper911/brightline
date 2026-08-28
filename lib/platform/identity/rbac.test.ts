import { describe, expect, it } from "vitest";
import { hasMinPlatformRole, pickHighestPlatformRole } from "@/lib/platform/identity/rbac";

describe("platform rbac", () => {
  it("compares role hierarchy", () => {
    expect(hasMinPlatformRole("OWNER", "ADMIN")).toBe(true);
    expect(hasMinPlatformRole("VIEWER", "EDITOR")).toBe(false);
    expect(hasMinPlatformRole("EDITOR", "EDITOR")).toBe(true);
  });

  it("picks highest role", () => {
    expect(pickHighestPlatformRole(["VIEWER", "ADMIN", "EDITOR"])).toBe("ADMIN");
    expect(pickHighestPlatformRole([])).toBeNull();
  });
});
