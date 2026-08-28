import { recordAuditSafely } from "@/lib/platform/audit/record-safely";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";

export type SiteMediaUploadUrlAuditInput = {
  key: string;
  folder: string;
  contentType: string;
};

/** Phase 3C — optional audit after successful platform-media upload URL creation. */
export async function auditSiteMediaUploadUrlCreated(
  input: SiteMediaUploadUrlAuditInput
): Promise<void> {
  await recordAuditSafely({
    context: createPlatformContextForTenant("brightline"),
    actor: { type: "SYSTEM" },
    action: "media.upload_url.created",
    resource: {
      type: "media_object",
      id: input.key,
    },
    metadata: {
      source: "admin",
      route: "/api/admin/site-media/upload-url",
      folder: input.folder,
      contentType: input.contentType,
    },
  });
}
