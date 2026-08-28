import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/platform/identity/repository", () => ({
  findPlatformUserById: vi.fn(),
  findPlatformUserByEmail: vi.fn(),
  findPlatformUserByLegacyLink: vi.fn(),
  listPlatformMembershipsForUserInTenant: vi.fn(),
}));

import {
  findPlatformUserByEmail,
  findPlatformUserById,
  findPlatformUserByLegacyLink,
  listPlatformMembershipsForUserInTenant,
} from "@/lib/platform/identity/repository";
import { DefaultIdentityService } from "@/lib/platform/identity/default-identity-service";
import { IdentityDisabledError } from "@/lib/platform/identity/errors";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";

const sampleUser = {
  id: "user-1",
  email: "ops@brightlinephotography.com",
  name: "Operator",
  status: "ACTIVE" as const,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

describe("DefaultIdentityService", () => {
  const savedFlag = process.env.PLATFORM_IDENTITY_ENABLED;
  const service = new DefaultIdentityService();
  const context = createPlatformContextForTenant("brightline");

  beforeEach(() => {
    process.env.PLATFORM_IDENTITY_ENABLED = "true";
    vi.mocked(findPlatformUserById).mockReset();
    vi.mocked(findPlatformUserByEmail).mockReset();
    vi.mocked(findPlatformUserByLegacyLink).mockReset();
    vi.mocked(listPlatformMembershipsForUserInTenant).mockReset();
  });

  afterEach(() => {
    if (savedFlag === undefined) delete process.env.PLATFORM_IDENTITY_ENABLED;
    else process.env.PLATFORM_IDENTITY_ENABLED = savedFlag;
  });

  it("throws when identity flag is off", async () => {
    delete process.env.PLATFORM_IDENTITY_ENABLED;
    await expect(service.findUserById(context, "user-1")).rejects.toBeInstanceOf(IdentityDisabledError);
  });

  it("findUserById delegates to repository", async () => {
    vi.mocked(findPlatformUserById).mockResolvedValue(sampleUser);
    const user = await service.findUserById(context, "user-1");
    expect(user?.email).toBe(sampleUser.email);
  });

  it("getMemberships scopes to context tenant", async () => {
    vi.mocked(listPlatformMembershipsForUserInTenant).mockResolvedValue([
      {
        id: "m-1",
        userId: "user-1",
        tenantSlug: "brightline",
        role: "ADMIN",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const memberships = await service.getMemberships(context, "user-1");
    expect(memberships[0]?.role).toBe("ADMIN");
    expect(listPlatformMembershipsForUserInTenant).toHaveBeenCalledWith("user-1", "brightline");
  });

  it("resolveLegacyIdentity returns null for admin_access", async () => {
    const user = await service.resolveLegacyIdentity(context, { kind: "admin_access" });
    expect(user).toBeNull();
    expect(findPlatformUserByLegacyLink).not.toHaveBeenCalled();
  });

  it("resolveLegacyIdentity looks up accountant_access links", async () => {
    vi.mocked(findPlatformUserByLegacyLink).mockResolvedValue(sampleUser);
    const user = await service.resolveLegacyIdentity(context, {
      kind: "accountant_access",
      accountantAccessId: "acct-9",
    });
    expect(user?.id).toBe("user-1");
    expect(findPlatformUserByLegacyLink).toHaveBeenCalledWith("accountant_access", "acct-9");
  });

  it("findUserByEmail delegates to repository", async () => {
    vi.mocked(findPlatformUserByEmail).mockResolvedValue(sampleUser);
    const user = await service.findUserByEmail(context, "ops@brightlinephotography.com");
    expect(user?.id).toBe("user-1");
  });
});
