import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { platformAuditService } from "@/lib/platform/audit/audit-service";
import { sanitizeAuditMetadata } from "@/lib/platform/audit/sanitize-metadata";
import {
  isValidPlatformAuditAction,
  PLATFORM_AUDIT_ACTOR_TYPES,
} from "@/lib/platform/audit/types";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    platformAuditEvent: { create: vi.fn() },
    platformTenant: { findUnique: vi.fn() },
  },
}));

const mockCreate = prisma.platformAuditEvent.create as ReturnType<typeof vi.fn>;
const mockFindTenant = prisma.platformTenant.findUnique as ReturnType<typeof vi.fn>;

const ENV_KEY = "PLATFORM_AUDIT_ENABLED";

describe("platform audit metadata sanitization", () => {
  it("redacts forbidden keys and signed URLs", () => {
    const sanitized = sanitizeAuditMetadata({
      source: "admin",
      apiKey: "sk-secret",
      handoffToken: "ho1.abc",
      url: "https://cdn.example.com/x?X-Amz-Signature=abc",
    }) as Record<string, unknown>;

    expect(sanitized.source).toBe("admin");
    expect(sanitized.apiKey).toBe("[REDACTED]");
    expect(sanitized.handoffToken).toBe("[REDACTED]");
    expect(sanitized.url).toBe("[REDACTED]");
  });
});

describe("platform audit action naming", () => {
  it("accepts dotted machine-readable actions", () => {
    expect(isValidPlatformAuditAction("platform.audit.test")).toBe(true);
    expect(isValidPlatformAuditAction("gallery.published")).toBe(true);
    expect(isValidPlatformAuditAction("User uploaded a file")).toBe(false);
  });
});

describe("platform audit service", () => {
  const savedEnv = process.env[ENV_KEY];

  beforeEach(() => {
    mockCreate.mockReset();
    mockFindTenant.mockReset();
    process.env[ENV_KEY] = "true";
  });

  afterEach(() => {
    if (savedEnv === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = savedEnv;
  });

  it("skips writes when PLATFORM_AUDIT_ENABLED is false", async () => {
    process.env[ENV_KEY] = "false";
    const result = await platformAuditService.record({
      context: createPlatformContextForTenant("brightline"),
      actor: { type: "SYSTEM" },
      action: "platform.audit.test",
      resource: { type: "system", id: "platform" },
    });

    expect(result).toEqual({ ok: true, skipped: true, reason: "disabled" });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("records platform.audit.test when enabled", async () => {
    mockFindTenant.mockResolvedValue({ id: "tenant-brightline", slug: "brightline" });
    mockCreate.mockResolvedValue({
      id: "audit-1",
      tenantId: "tenant-brightline",
      tenantSlug: "brightline",
      actorType: "SYSTEM",
      actorId: null,
      action: "platform.audit.test",
      resourceType: "system",
      resourceId: "platform",
      metadata: { source: "test" },
      createdAt: new Date(),
    });

    const result = await platformAuditService.record({
      context: createPlatformContextForTenant("brightline"),
      actor: { type: "SYSTEM" },
      action: "platform.audit.test",
      resource: { type: "system", id: "platform" },
      metadata: { source: "test", password: "secret" },
    });

    expect(result).toEqual({ ok: true, skipped: false, id: "audit-1" });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantSlug: "brightline",
          tenantId: "tenant-brightline",
          actorType: "SYSTEM",
          action: "platform.audit.test",
          metadata: expect.objectContaining({ source: "test", password: "[REDACTED]" }),
        }),
      })
    );
  });

  it("does not throw on write failure by default", async () => {
    mockFindTenant.mockResolvedValue(null);
    mockCreate.mockRejectedValue(new Error("db unavailable"));

    const result = await platformAuditService.record({
      context: createPlatformContextForTenant("mirotech"),
      actor: { type: "SERVICE", id: "worker" },
      action: "platform.audit.test",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("db unavailable");
    }
  });

  it("supports all actor types", () => {
    expect(PLATFORM_AUDIT_ACTOR_TYPES).toEqual(["USER", "SYSTEM", "AGENT", "SERVICE"]);
  });
});
