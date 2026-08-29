import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/platform/audit/audit-service", () => ({
  platformAuditService: {
    record: vi.fn(),
  },
}));

import { platformAuditService } from "@/lib/platform/audit/audit-service";
import { recordAuditSafely } from "@/lib/platform/audit/record-safely";
import { testPlatformContext } from "@/lib/testing/fixtures";

const mockRecord = platformAuditService.record as ReturnType<typeof vi.fn>;

describe("recordAuditSafely", () => {
  beforeEach(() => {
    mockRecord.mockReset();
  });

  it("delegates to audit service with strict=false", async () => {
    mockRecord.mockResolvedValue({ ok: true, skipped: false, id: "audit-1" });

    const result = await recordAuditSafely({
      context: testPlatformContext("brightline"),
      actor: { type: "SYSTEM" },
      action: "platform.audit.test",
      resource: { type: "system", id: "platform" },
    });

    expect(result).toEqual({ ok: true, skipped: false, id: "audit-1" });
    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        strict: false,
        action: "platform.audit.test",
      })
    );
  });

  it("returns failure result without throwing when audit write fails", async () => {
    mockRecord.mockResolvedValue({ ok: false, error: "db unavailable" });

    const result = await recordAuditSafely({
      context: testPlatformContext("mirotech"),
      actor: { type: "SERVICE", id: "worker" },
      action: "job.completed",
      resource: { type: "job", id: "job-1" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("db unavailable");
  });
});
