import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { auditDesignSectionSettingsSaved } from "@/lib/platform/audit/integrations/design-section-settings";
import { platformAuditService } from "@/lib/platform/audit/audit-service";
import { saveDesignSectionSettings } from "@/lib/design-section-settings";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/platform/audit/audit-service", () => ({
  platformAuditService: { record: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    siteSetting: { upsert: vi.fn() },
  },
}));

const mockRecord = platformAuditService.record as ReturnType<typeof vi.fn>;
const mockUpsert = prisma.siteSetting.upsert as ReturnType<typeof vi.fn>;

describe("design section settings audit integration (Phase 2B)", () => {
  beforeEach(() => {
    mockRecord.mockReset();
    mockUpsert.mockReset();
    mockUpsert.mockResolvedValue({});
    mockRecord.mockResolvedValue({ ok: true, skipped: false, id: "audit-1" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("records site_setting.updated after successful save", async () => {
    await saveDesignSectionSettings({ enabled: true, showInNav: false });
    await auditDesignSectionSettingsSaved({ enabled: true, showInNav: false });

    expect(mockUpsert).toHaveBeenCalled();
    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        strict: false,
        action: "site_setting.updated",
        context: expect.objectContaining({
          tenant: expect.objectContaining({ slug: "brightline" }),
        }),
        resource: {
          type: "site_setting",
          id: "design_section:v1",
        },
        metadata: expect.objectContaining({
          source: "admin",
          changedFields: ["enabled", "showInNav"],
        }),
        actor: { type: "SYSTEM" },
      })
    );
  });

  it("does not throw when audit write fails after successful save", async () => {
    mockRecord.mockResolvedValue({ ok: false, error: "db unavailable" });

    await saveDesignSectionSettings({ enabled: false });
    await expect(
      auditDesignSectionSettingsSaved({ enabled: false })
    ).resolves.toBeUndefined();
  });

  it("does not record audit when save fails", async () => {
    mockUpsert.mockRejectedValue(new Error("save failed"));

    await expect(saveDesignSectionSettings({ enabled: true })).rejects.toThrow("save failed");
    expect(mockRecord).not.toHaveBeenCalled();
  });
});
