import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import { resolvePlatformUserFromLegacySession } from "@/lib/platform/identity/legacy-resolver";
import type { IdentityService } from "@/lib/platform/identity/identity-service";

describe("resolvePlatformUserFromLegacySession", () => {
  const savedFlag = process.env.PLATFORM_IDENTITY_ENABLED;
  const context = createPlatformContextForTenant("brightline");

  beforeEach(() => {
    process.env.PLATFORM_IDENTITY_ENABLED = "true";
  });

  afterEach(() => {
    if (savedFlag === undefined) delete process.env.PLATFORM_IDENTITY_ENABLED;
    else process.env.PLATFORM_IDENTITY_ENABLED = savedFlag;
  });

  it("returns null when identity flag is off without throwing", async () => {
    delete process.env.PLATFORM_IDENTITY_ENABLED;
    const identityService: IdentityService = {
      findUserById: vi.fn(),
      findUserByEmail: vi.fn(),
      getMemberships: vi.fn(),
      resolveLegacyIdentity: vi.fn(),
    };
    const user = await resolvePlatformUserFromLegacySession(
      context,
      { kind: "accountant_access", accountantAccessId: "acct-1" },
      identityService
    );
    expect(user).toBeNull();
    expect(identityService.resolveLegacyIdentity).not.toHaveBeenCalled();
  });

  it("returns null for admin_access (no mappable user id)", async () => {
    const identityService: IdentityService = {
      findUserById: vi.fn(),
      findUserByEmail: vi.fn(),
      getMemberships: vi.fn(),
      resolveLegacyIdentity: vi.fn().mockResolvedValue(null),
    };
    const user = await resolvePlatformUserFromLegacySession(
      context,
      { kind: "admin_access" },
      identityService
    );
    expect(user).toBeNull();
  });

  it("returns mapped user when identity service resolves link", async () => {
    const identityService: IdentityService = {
      findUserById: vi.fn(),
      findUserByEmail: vi.fn(),
      getMemberships: vi.fn(),
      resolveLegacyIdentity: vi.fn().mockResolvedValue({
        id: "user-1",
        email: "finance@example.com",
        name: null,
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };
    const user = await resolvePlatformUserFromLegacySession(
      context,
      { kind: "accountant_access", accountantAccessId: "acct-1" },
      identityService
    );
    expect(user?.id).toBe("user-1");
  });

  it("swallows identity service errors and returns null", async () => {
    const identityService: IdentityService = {
      findUserById: vi.fn(),
      findUserByEmail: vi.fn(),
      getMemberships: vi.fn(),
      resolveLegacyIdentity: vi.fn().mockRejectedValue(new Error("db down")),
    };
    const user = await resolvePlatformUserFromLegacySession(
      context,
      { kind: "accountant_access", accountantAccessId: "acct-1" },
      identityService
    );
    expect(user).toBeNull();
  });
});
