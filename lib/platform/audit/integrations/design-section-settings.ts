import { recordAuditSafely } from "@/lib/platform/audit/record-safely";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import { DESIGN_SECTION_SETTING_KEY } from "@/lib/design-section-settings";

function changedFieldKeys(body: unknown): string[] {
  if (!body || typeof body !== "object" || Array.isArray(body)) return [];
  return Object.keys(body as Record<string, unknown>).slice(0, 20);
}

/**
 * Phase 2B — first production audit integration.
 * Call only after saveDesignSectionSettings succeeds.
 */
export async function auditDesignSectionSettingsSaved(body: unknown): Promise<void> {
  await recordAuditSafely({
    context: createPlatformContextForTenant("brightline"),
    actor: { type: "SYSTEM" },
    action: "site_setting.updated",
    resource: {
      type: "site_setting",
      id: DESIGN_SECTION_SETTING_KEY,
    },
    metadata: {
      source: "admin",
      route: "/api/admin/design-section",
      changedFields: changedFieldKeys(body),
    },
  });
}
