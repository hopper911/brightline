import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/platform/identity/repository", () => ({
  findPlatformUserByLegacyLink: vi.fn(),
  findPlatformUserByEmail: vi.fn(),
  createPlatformUser: vi.fn(),
  createPlatformLegacyIdentityLink: vi.fn(),
  upsertPlatformMembership: vi.fn(),
}));

import {
  createPlatformLegacyIdentityLink,
  createPlatformUser,
  findPlatformUserByEmail,
  findPlatformUserByLegacyLink,
  upsertPlatformMembership,
} from "@/lib/platform/identity/repository";
import { ensureAccountantPlatformUser, ensureAdminPlatformUser } from "@/lib/platform/identity/link-legacy";

const savedIdentity = process.env.PLATFORM_IDENTITY_ENABLED;

describe("ensureAccountantPlatformUser", () => {
  beforeEach(() => {
    process.env.PLATFORM_IDENTITY_ENABLED = "true";
    vi.mocked(findPlatformUserByLegacyLink).mockReset();
    vi.mocked(findPlatformUserByEmail).mockReset();
    vi.mocked(createPlatformUser).mockReset();
    vi.mocked(createPlatformLegacyIdentityLink).mockReset();
    vi.mocked(upsertPlatformMembership).mockReset();
  });

  afterEach(() => {
    if (savedIdentity === undefined) delete process.env.PLATFORM_IDENTITY_ENABLED;
    else process.env.PLATFORM_IDENTITY_ENABLED = savedIdentity;
  });

  it("returns null when identity flag is off", async () => {
    delete process.env.PLATFORM_IDENTITY_ENABLED;
    const result = await ensureAccountantPlatformUser({
      accountantAccessId: "acc-1",
      email: "ops@example.com",
    });
    expect(result).toBeNull();
  });

  it("links existing user by legacy link", async () => {
    vi.mocked(findPlatformUserByLegacyLink).mockResolvedValue({
      id: "user-1",
      email: "ops@example.com",
      name: null,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(upsertPlatformMembership).mockResolvedValue({
      id: "m-1",
      userId: "user-1",
      tenantSlug: "brightline",
      role: "EDITOR",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await ensureAccountantPlatformUser({
      accountantAccessId: "acc-1",
      email: "ops@example.com",
    });

    expect(result?.user.id).toBe("user-1");
    expect(createPlatformUser).not.toHaveBeenCalled();
  });

  it("creates user, link, and membership when unmapped", async () => {
    vi.mocked(findPlatformUserByLegacyLink).mockResolvedValue(null);
    vi.mocked(findPlatformUserByEmail).mockResolvedValue(null);
    vi.mocked(createPlatformUser).mockResolvedValue({
      id: "user-new",
      email: "ops@example.com",
      name: null,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(createPlatformLegacyIdentityLink).mockResolvedValue(true);
    vi.mocked(upsertPlatformMembership).mockResolvedValue({
      id: "m-1",
      userId: "user-new",
      tenantSlug: "brightline",
      role: "EDITOR",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await ensureAccountantPlatformUser({
      accountantAccessId: "acc-1",
      email: "ops@example.com",
    });

    expect(result?.created).toBe(true);
    expect(result?.linked).toBe(true);
    expect(createPlatformUser).toHaveBeenCalled();
    expect(createPlatformLegacyIdentityLink).toHaveBeenCalled();
  });
});

describe("ensureAdminPlatformUser", () => {
  beforeEach(() => {
    process.env.PLATFORM_IDENTITY_ENABLED = "true";
    process.env.ADMIN_EMAIL = "ops@example.com";
    vi.mocked(findPlatformUserByLegacyLink).mockReset();
    vi.mocked(findPlatformUserByEmail).mockReset();
    vi.mocked(createPlatformUser).mockReset();
    vi.mocked(createPlatformLegacyIdentityLink).mockReset();
    vi.mocked(upsertPlatformMembership).mockReset();
  });

  it("returns null without ADMIN_EMAIL", async () => {
    delete process.env.ADMIN_EMAIL;
    const result = await ensureAdminPlatformUser();
    expect(result).toBeNull();
  });

  it("creates shared admin link and dual tenant memberships", async () => {
    vi.mocked(findPlatformUserByLegacyLink).mockResolvedValue(null);
    vi.mocked(findPlatformUserByEmail).mockResolvedValue(null);
    vi.mocked(createPlatformUser).mockResolvedValue({
      id: "admin-user",
      email: "ops@example.com",
      name: null,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(createPlatformLegacyIdentityLink).mockResolvedValue(true);
    vi.mocked(upsertPlatformMembership).mockResolvedValue({
      id: "m-1",
      userId: "admin-user",
      tenantSlug: "brightline",
      role: "OWNER",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await ensureAdminPlatformUser();
    expect(result?.linked).toBe(true);
    expect(createPlatformLegacyIdentityLink).toHaveBeenCalledWith({
      userId: "admin-user",
      legacyKind: "admin_access",
      legacyRefId: "shared",
    });
    expect(upsertPlatformMembership).toHaveBeenCalledTimes(2);
  });
});
