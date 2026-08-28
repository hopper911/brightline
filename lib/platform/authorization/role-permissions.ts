import type { PlatformMembershipRole } from "@/lib/platform/identity/types";
import type { PlatformPermission } from "@/lib/platform/authorization/permissions";
import type { TenantSlug } from "@/lib/platform/tenants/types";

const BL_READ: PlatformPermission[] = [
  "brightline.gallery.read",
  "brightline.journal.read",
];

const BL_WRITE: PlatformPermission[] = [
  ...BL_READ,
  "brightline.gallery.write",
  "brightline.journal.write",
];

const BL_PUBLISH: PlatformPermission[] = [...BL_WRITE, "brightline.journal.publish"];

const BL_ADMIN: PlatformPermission[] = [...BL_PUBLISH, "brightline.client.manage"];

const MT_READ: PlatformPermission[] = ["mirotech.project.read", "mirotech.journal.read"];

const MT_DRAFT: PlatformPermission[] = [
  ...MT_READ,
  "mirotech.project.write",
  "mirotech.case-study.draft",
  "mirotech.journal.write",
];

const MT_PUBLISH: PlatformPermission[] = [
  ...MT_DRAFT,
  "mirotech.case-study.publish",
  "mirotech.journal.publish",
];

const PLATFORM_VIEWER: PlatformPermission[] = ["platform.media.read"];

const PLATFORM_EDITOR: PlatformPermission[] = [...PLATFORM_VIEWER, "platform.media.write"];

const PLATFORM_ADMIN: PlatformPermission[] = [...PLATFORM_EDITOR, "platform.audit.read", "platform.identity.read"];

const PLATFORM_OWNER: PlatformPermission[] = [...PLATFORM_ADMIN, "platform.identity.manage"];

function roleSet(
  brightline: PlatformPermission[],
  mirotech: PlatformPermission[],
  platform: PlatformPermission[]
): PlatformPermission[] {
  return [...brightline, ...mirotech, ...platform];
}

/** Permissions granted by role within a tenant context (Phase 8B). */
export const TENANT_ROLE_PERMISSIONS: Record<
  TenantSlug,
  Record<PlatformMembershipRole, readonly PlatformPermission[]>
> = {
  brightline: {
    VIEWER: roleSet(BL_READ, [], PLATFORM_VIEWER),
    EDITOR: roleSet(BL_WRITE, [], PLATFORM_EDITOR),
    ADMIN: roleSet(BL_ADMIN, [], PLATFORM_ADMIN),
    OWNER: roleSet(BL_ADMIN, [], PLATFORM_OWNER),
  },
  mirotech: {
    VIEWER: roleSet([], MT_READ, PLATFORM_VIEWER),
    EDITOR: roleSet([], MT_DRAFT, PLATFORM_EDITOR),
    ADMIN: roleSet([], MT_PUBLISH, PLATFORM_ADMIN),
    OWNER: roleSet([], MT_PUBLISH, PLATFORM_OWNER),
  },
};

export function permissionsForRole(
  tenantSlug: TenantSlug,
  role: PlatformMembershipRole
): readonly PlatformPermission[] {
  return TENANT_ROLE_PERMISSIONS[tenantSlug][role];
}

/** Union of permissions across all roles the user holds (deduped). */
export function mergeRolePermissions(
  assignments: Array<{ tenantSlug: TenantSlug; role: PlatformMembershipRole }>
): PlatformPermission[] {
  const out = new Set<PlatformPermission>();
  for (const { tenantSlug, role } of assignments) {
    for (const p of permissionsForRole(tenantSlug, role)) {
      out.add(p);
    }
  }
  return [...out];
}
