import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/studio/projects/resolve-subject", () => ({
  resolveStudioAuthorizationSubject: vi.fn(),
}));

vi.mock("@/lib/platform/authorization/default-authorization-service", () => ({
  defaultAuthorizationService: {
    requirePermission: vi.fn(),
  },
}));

import { rejectUnlessPlatformPermission } from "@/lib/platform/authorization/require-route-permission";
import { defaultAuthorizationService } from "@/lib/platform/authorization/default-authorization-service";
import { PermissionDeniedError } from "@/lib/platform/authorization/errors";
import { resolveStudioAuthorizationSubject } from "@/lib/studio/projects/resolve-subject";

describe("rejectUnlessPlatformPermission", () => {
  const saved = process.env.PLATFORM_IDENTITY_ENABLED;

  beforeEach(() => {
    vi.mocked(resolveStudioAuthorizationSubject).mockReset();
    vi.mocked(defaultAuthorizationService.requirePermission).mockReset();
  });

  afterEach(() => {
    if (saved === undefined) delete process.env.PLATFORM_IDENTITY_ENABLED;
    else process.env.PLATFORM_IDENTITY_ENABLED = saved;
  });

  it("is a no-op when identity is off", async () => {
    delete process.env.PLATFORM_IDENTITY_ENABLED;
    await expect(rejectUnlessPlatformPermission("platform.media.write")).resolves.toBeNull();
    expect(defaultAuthorizationService.requirePermission).not.toHaveBeenCalled();
  });

  it("returns 403 when identity is on and permission is denied", async () => {
    process.env.PLATFORM_IDENTITY_ENABLED = "true";
    vi.mocked(resolveStudioAuthorizationSubject).mockResolvedValue({ kind: "user", userId: "u1" });
    vi.mocked(defaultAuthorizationService.requirePermission).mockRejectedValue(
      new PermissionDeniedError("platform.media.write", "brightline")
    );
    const res = await rejectUnlessPlatformPermission("platform.media.write");
    expect(res?.status).toBe(403);
  });

  it("allows when identity is on and permission is granted", async () => {
    process.env.PLATFORM_IDENTITY_ENABLED = "true";
    vi.mocked(resolveStudioAuthorizationSubject).mockResolvedValue({ kind: "legacy_admin" });
    vi.mocked(defaultAuthorizationService.requirePermission).mockResolvedValue(undefined);
    await expect(rejectUnlessPlatformPermission("platform.media.write")).resolves.toBeNull();
  });
});
