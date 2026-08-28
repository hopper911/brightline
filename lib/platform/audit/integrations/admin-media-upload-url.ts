import { recordAuditSafely } from "@/lib/platform/audit/record-safely";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";

export type AdminMediaUploadUrlAuditInput = {
  route: string;
  key: string;
  contentType: string;
  metadata?: Record<string, unknown>;
};

/** Optional audit after successful admin upload URL creation (platform media path). */
export async function auditAdminMediaUploadUrlCreated(
  input: AdminMediaUploadUrlAuditInput
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
      route: input.route,
      contentType: input.contentType,
      ...input.metadata,
    },
  });
}
