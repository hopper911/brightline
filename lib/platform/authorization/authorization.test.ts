import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/platform/identity/repository", () => ({
  listPlatformMembershipsForUserInTenant: vi.fn(),
}));

import { listPlatformMembershipsForUserInTenant } from "@/lib/platform/identity/repository";
import { DefaultAuthorizationService } from "@/lib/platform/authorization/default-authorization-service";
import {
  AGENT_SCOPE_CASE_STUDY_DRAFTER,
  permissionAllowedByAgentScope,
} from "@/lib/platform/authorization/agent-scopes";
import { AuthorizationDisabledError, PermissionDeniedError } from "@/lib/platform/authorization/errors";
import { permissionsForRole } from "@/lib/platform/authorization/role-permissions";

describe("DefaultAuthorizationService", () => {
  const saved = process.env.PLATFORM_IDENTITY_ENABLED;
  const service = new DefaultAuthorizationService();

  beforeEach(() => {
    process.env.PLATFORM_IDENTITY_ENABLED = "true";
    vi.mocked(listPlatformMembershipsForUserInTenant).mockReset();
  });

  afterEach(() => {
    if (saved === undefined) delete process.env.PLATFORM_IDENTITY_ENABLED;
    else process.env.PLATFORM_IDENTITY_ENABLED = saved;
  });

  it("throws when identity flag is off", async () => {
    delete process.env.PLATFORM_IDENTITY_ENABLED;
    await expect(
      service.can({
        subject: { kind: "legacy_admin" },
        tenant: "brightline",
        permission: "platform.identity.read",
      })
    ).rejects.toBeInstanceOf(AuthorizationDisabledError);
  });

  it("owner on brightline can read gallery but not mirotech project in brightline tenant context", async () => {
    vi.mocked(listPlatformMembershipsForUserInTenant).mockResolvedValue([
      {
        id: "m-1",
        userId: "user-1",
        tenantSlug: "brightline",
        role: "OWNER",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await expect(
      service.can({
        subject: { kind: "user", userId: "user-1" },
        tenant: "brightline",
        permission: "brightline.gallery.read",
      })
    ).resolves.toBe(true);

    await expect(
      service.can({
        subject: { kind: "user", userId: "user-1" },
        tenant: "brightline",
        permission: "mirotech.project.read",
      })
    ).resolves.toBe(false);
  });

  it("editor on mirotech can draft but not publish case study", async () => {
    vi.mocked(listPlatformMembershipsForUserInTenant).mockResolvedValue([
      {
        id: "m-2",
        userId: "user-2",
        tenantSlug: "mirotech",
        role: "EDITOR",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await expect(
      service.can({
        subject: { kind: "user", userId: "user-2" },
        tenant: "mirotech",
        permission: "mirotech.case-study.draft",
      })
    ).resolves.toBe(true);

    await expect(
      service.can({
        subject: { kind: "user", userId: "user-2" },
        tenant: "mirotech",
        permission: "mirotech.case-study.publish",
      })
    ).resolves.toBe(false);
  });

  it("viewer cannot write gallery", async () => {
    vi.mocked(listPlatformMembershipsForUserInTenant).mockResolvedValue([
      {
        id: "m-3",
        userId: "user-3",
        tenantSlug: "brightline",
        role: "VIEWER",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await expect(
      service.can({
        subject: { kind: "user", userId: "user-3" },
        tenant: "brightline",
        permission: "brightline.gallery.write",
      })
    ).resolves.toBe(false);
  });

  it("brightline editor does not grant mirotech access in mirotech tenant", async () => {
    vi.mocked(listPlatformMembershipsForUserInTenant).mockResolvedValue([]);

    await expect(
      service.can({
        subject: { kind: "user", userId: "user-bl-editor" },
        tenant: "mirotech",
        permission: "mirotech.project.read",
      })
    ).resolves.toBe(false);
  });

  it("requirePermission throws PermissionDeniedError", async () => {
    vi.mocked(listPlatformMembershipsForUserInTenant).mockResolvedValue([
      {
        id: "m-4",
        userId: "user-4",
        tenantSlug: "brightline",
        role: "VIEWER",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await expect(
      service.requirePermission({
        subject: { kind: "user", userId: "user-4" },
        tenant: "brightline",
        permission: "brightline.client.manage",
      })
    ).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("legacy_admin probe grants platform.identity.read in brightline context", async () => {
    await expect(
      service.can({
        subject: { kind: "legacy_admin" },
        tenant: "brightline",
        permission: "platform.identity.read",
      })
    ).resolves.toBe(true);
  });

  it("agent scope allows draft but not publish", () => {
    expect(
      permissionAllowedByAgentScope(AGENT_SCOPE_CASE_STUDY_DRAFTER, "mirotech.case-study.draft")
    ).toBe(true);
    expect(
      permissionAllowedByAgentScope(AGENT_SCOPE_CASE_STUDY_DRAFTER, "mirotech.case-study.publish")
    ).toBe(false);
  });

  it("role permission sets are stable", () => {
    expect(permissionsForRole("brightline", "ADMIN")).toContain("brightline.client.manage");
    expect(permissionsForRole("mirotech", "ADMIN")).toContain("mirotech.case-study.publish");
  });
});
