import { describe, expect, it } from "vitest";

import {
  isPlatformMembershipRole,
  isPlatformUserStatus,
  normalizePlatformEmail,
} from "@/lib/platform/identity/types";

describe("platform identity types", () => {
  it("validates user status and membership roles", () => {
    expect(isPlatformUserStatus("ACTIVE")).toBe(true);
    expect(isPlatformUserStatus("UNKNOWN")).toBe(false);
    expect(isPlatformMembershipRole("OWNER")).toBe(true);
    expect(isPlatformMembershipRole("SUPERADMIN")).toBe(false);
  });

  it("normalizes email for lookup", () => {
    expect(normalizePlatformEmail("  User@Example.COM ")).toBe("user@example.com");
  });
});
