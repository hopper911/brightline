import { mergeRolePermissions } from "@/lib/platform/authorization/role-permissions";
import type { PlatformPermission } from "@/lib/platform/authorization/permissions";

/**
 * Synthetic OWNER-level permission set for legacy admin cookie sessions.
 * Used only for dual-auth probe routes — does NOT replace authorizeAdminRequest.
 */
export function legacyAdminEffectivePermissions(): PlatformPermission[] {
  return mergeRolePermissions([
    { tenantSlug: "brightline", role: "OWNER" },
    { tenantSlug: "mirotech", role: "OWNER" },
  ]);
}
