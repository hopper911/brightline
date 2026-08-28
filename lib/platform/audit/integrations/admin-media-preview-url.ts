import { recordAuditSafely } from "@/lib/platform/audit/record-safely";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";

export type AdminMediaPreviewUrlAuditInput = {
  route: string;
  key: string;
};

/** Optional audit after successful admin preview URL signing (platform media path). */
export async function auditAdminMediaPreviewUrlCreated(
  input: AdminMediaPreviewUrlAuditInput
): Promise<void> {
  await recordAuditSafely({
    context: createPlatformContextForTenant("brightline"),
    actor: { type: "SYSTEM" },
    action: "media.preview_url.created",
    resource: {
      type: "media_object",
      id: input.key,
    },
    metadata: {
      source: "admin",
      route: input.route,
    },
  });
}
