import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRecordAuditSafely } = vi.hoisted(() => ({
  mockRecordAuditSafely: vi.fn(),
}));

vi.mock("@/lib/platform/audit/record-safely", () => ({
  recordAuditSafely: mockRecordAuditSafely,
}));

import { auditAdminMediaPreviewUrlCreated } from "@/lib/platform/audit/integrations/admin-media-preview-url";
import { auditAdminMediaUploadUrlCreated } from "@/lib/platform/audit/integrations/admin-media-upload-url";

describe("Phase 3D admin media audit integrations", () => {
  beforeEach(() => {
    mockRecordAuditSafely.mockReset();
    mockRecordAuditSafely.mockResolvedValue({ ok: true, skipped: true, reason: "disabled" });
  });

  it("records media.upload_url.created", async () => {
    await auditAdminMediaUploadUrlCreated({
      route: "/api/admin/site-backgrounds/upload-url",
      key: "site/backgrounds/full/1-a.mp4",
      contentType: "video/mp4",
      metadata: { folder: "full" },
    });

    expect(mockRecordAuditSafely).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "media.upload_url.created",
        resource: { type: "media_object", id: "site/backgrounds/full/1-a.mp4" },
      })
    );
  });

  it("records media.preview_url.created", async () => {
    await auditAdminMediaPreviewUrlCreated({
      route: "/api/admin/media/sign",
      key: "journal/post.jpg",
    });

    expect(mockRecordAuditSafely).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "media.preview_url.created",
        resource: { type: "media_object", id: "journal/post.jpg" },
      })
    );
  });
});
