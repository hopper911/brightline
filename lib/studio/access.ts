import type { PlatformPermission } from "@/lib/platform/authorization/permissions";
import { permissionsForRole } from "@/lib/platform/authorization/role-permissions";
import type { TenantSlug } from "@/lib/platform/tenants/types";
import type { StudioOpsMembership } from "@/lib/studio/ops/types";

export function studioLegacyAdminBypass(legacyAdmin: boolean): boolean {
  return legacyAdmin;
}

export function canReadBrightlineStudioContent(
  permissions: PlatformPermission[],
  legacyAdmin: boolean
): boolean {
  if (legacyAdmin) return true;
  return permissions.includes("brightline.journal.read");
}

export function canReadMirotechStudioContent(
  permissions: PlatformPermission[],
  legacyAdmin: boolean
): boolean {
  if (legacyAdmin) return true;
  return permissions.includes("mirotech.project.read");
}

export function canReadStudioMedia(
  permissions: PlatformPermission[],
  legacyAdmin: boolean
): boolean {
  if (legacyAdmin) return true;
  return permissions.includes("platform.media.read");
}

export function canViewStudioPublishing(
  permissions: PlatformPermission[],
  legacyAdmin: boolean
): boolean {
  if (legacyAdmin) return true;
  return (
    permissions.includes("brightline.journal.publish") ||
    permissions.includes("mirotech.journal.publish")
  );
}

export function canPublishBrightlineJournal(
  permissions: PlatformPermission[],
  legacyAdmin: boolean
): boolean {
  if (legacyAdmin) return true;
  return permissions.includes("brightline.journal.publish");
}

export function canPublishMirotechJournal(
  permissions: PlatformPermission[],
  legacyAdmin: boolean
): boolean {
  if (legacyAdmin) return true;
  return permissions.includes("mirotech.journal.publish");
}

export function allowedPublishingTenants(
  permissions: PlatformPermission[],
  legacyAdmin: boolean,
  memberships: StudioOpsMembership[]
): TenantSlug[] {
  if (legacyAdmin) {
    return memberships.map((m) => m.tenantSlug);
  }
  const allowed = new Set<TenantSlug>();
  if (canPublishBrightlineJournal(permissions, false)) allowed.add("brightline");
  if (canPublishMirotechJournal(permissions, false)) allowed.add("mirotech");
  return memberships.map((m) => m.tenantSlug).filter((t) => allowed.has(t));
}

export function canRetryPublishingJob(
  jobTenant: TenantSlug,
  permissions: PlatformPermission[],
  legacyAdmin: boolean
): boolean {
  if (legacyAdmin) return true;
  if (jobTenant === "brightline") return canPublishBrightlineJournal(permissions, false);
  return canPublishMirotechJournal(permissions, false);
}

export function canViewStudioActivity(
  permissions: PlatformPermission[],
  legacyAdmin: boolean,
  memberships: StudioOpsMembership[]
): boolean {
  if (legacyAdmin) return true;
  if (permissions.includes("platform.audit.read")) return true;
  return allowedAuditTenants(permissions, false, memberships).length > 0;
}

/** Tenants whose audit stream the operator may view. */
export function allowedAuditTenants(
  permissions: PlatformPermission[],
  legacyAdmin: boolean,
  memberships: StudioOpsMembership[]
): TenantSlug[] {
  if (legacyAdmin) return memberships.map((m) => m.tenantSlug);
  const allowed: TenantSlug[] = [];
  for (const m of memberships) {
    const rolePerms = permissionsForRole(m.tenantSlug, m.role);
    if (rolePerms.includes("platform.audit.read")) {
      allowed.push(m.tenantSlug);
    }
  }
  // Active tenant permissions from identity service may include platform.audit.read
  if (
    permissions.includes("platform.audit.read") &&
    memberships.length === 1 &&
    !allowed.includes(memberships[0].tenantSlug)
  ) {
    allowed.push(memberships[0].tenantSlug);
  }
  return [...new Set(allowed)];
}

export function tenantRouteAllowed(
  activeTenant: TenantSlug,
  routeTenant: TenantSlug
): boolean {
  return activeTenant === routeTenant;
}

export function contentAdminEditHref(
  tenant: TenantSlug,
  type: string,
  id: string
): string | null {
  if (tenant === "brightline" && type === "work-project") {
    return `/admin/work/${encodeURIComponent(id)}`;
  }
  if (tenant === "brightline" && type === "portfolio-project") {
    return `/admin/portfolio`;
  }
  if (tenant === "mirotech" && type === "dual-brand-work") {
    return `/admin/studio-cms/${encodeURIComponent(id)}`;
  }
  if (tenant === "mirotech" && type === "mirotech-case-study") {
    return `/api/admin/mirotech/handoff?next=${encodeURIComponent("/admin/work")}`;
  }
  return null;
}
