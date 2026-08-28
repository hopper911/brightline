import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRecordAuditSafely } = vi.hoisted(() => ({
  mockRecordAuditSafely: vi.fn(),
}));

vi.mock("@/lib/platform/audit/record-safely", () => ({
  recordAuditSafely: mockRecordAuditSafely,
}));

import { auditSiteMediaUploadUrlCreated } from "@/lib/platform/audit/integrations/site-media-upload-url";

describe("auditSiteMediaUploadUrlCreated", () => {
  beforeEach(() => {
    mockRecordAuditSafely.mockReset();
    mockRecordAuditSafely.mockResolvedValue({ ok: true, skipped: true, reason: "disabled" });
  });

  it("records media.upload_url.created with object key resource", async () => {
    await auditSiteMediaUploadUrlCreated({
      key: "site/pages/1-hero.jpg",
      folder: "pages",
      contentType: "image/jpeg",
    });

    expect(mockRecordAuditSafely).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "media.upload_url.created",
        resource: { type: "media_object", id: "site/pages/1-hero.jpg" },
        metadata: expect.objectContaining({
          route: "/api/admin/site-media/upload-url",
          folder: "pages",
          contentType: "image/jpeg",
        }),
      })
    );
  });
});
