import "server-only";

import { permissionAllowedByAgentScope } from "@/lib/platform/authorization/agent-scopes";
import type { AuthorizationService } from "@/lib/platform/authorization/authorization-service";
import {
  AuthorizationDisabledError,
  PermissionDeniedError,
} from "@/lib/platform/authorization/errors";
import { legacyAdminEffectivePermissions } from "@/lib/platform/authorization/legacy-admin-grant";
import {
  isPlatformPermission,
  permissionTenantScope,
  type PlatformPermission,
} from "@/lib/platform/authorization/permissions";
import { permissionsForRole } from "@/lib/platform/authorization/role-permissions";
import type {
  AuthorizationCheckInput,
  AuthorizationSubject,
  ListPermissionsInput,
} from "@/lib/platform/authorization/types";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import { pickHighestPlatformRole } from "@/lib/platform/identity/rbac";
import { listPlatformMembershipsForUserInTenant } from "@/lib/platform/identity/repository";
import type { PlatformMembershipRole } from "@/lib/platform/identity/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";

function permissionAppliesInTenant(permission: PlatformPermission, tenant: TenantSlug): boolean {
  const scope = permissionTenantScope(permission);
  if (scope === "platform") return true;
  return scope === tenant;
}

function filterForTenant(
  permissions: PlatformPermission[],
  tenant: TenantSlug
): PlatformPermission[] {
  return permissions.filter((p) => permissionAppliesInTenant(p, tenant));
}

/**
 * Default AuthorizationService — tenant-scoped RBAC beside legacy auth (Phase 8B).
 * Gated by PLATFORM_IDENTITY_ENABLED. Does not replace route guards.
 */
export class DefaultAuthorizationService implements AuthorizationService {
  async can(input: AuthorizationCheckInput): Promise<boolean> {
    this.assertEnabled();
    if (!isPlatformPermission(input.permission)) return false;

    const effective = await this.resolveEffectivePermissions(input.subject, input.tenant);
    if (!permissionAppliesInTenant(input.permission, input.tenant)) {
      return false;
    }
    return effective.includes(input.permission);
  }

  async requirePermission(input: AuthorizationCheckInput): Promise<void> {
    const allowed = await this.can(input);
    if (!allowed) {
      throw new PermissionDeniedError(input.permission, input.tenant);
    }
  }

  async listPermissions(input: ListPermissionsInput): Promise<PlatformPermission[]> {
    this.assertEnabled();
    const effective = await this.resolveEffectivePermissions(input.subject, input.tenant);
    return filterForTenant(effective, input.tenant);
  }

  permissionAllowedByAgentScope(
    scope: readonly PlatformPermission[],
    permission: PlatformPermission
  ): boolean {
    return permissionAllowedByAgentScope(scope, permission);
  }

  filterPermissionsForTenant(
    permissions: PlatformPermission[],
    tenant: TenantSlug
  ): PlatformPermission[] {
    return filterForTenant(permissions, tenant);
  }

  private async resolveEffectivePermissions(
    subject: AuthorizationSubject,
    tenant: TenantSlug
  ): Promise<PlatformPermission[]> {
    if (subject.kind === "legacy_admin") {
      return filterForTenant(legacyAdminEffectivePermissions(), tenant);
    }

    if (subject.kind === "agent") {
      return filterForTenant([...subject.scope], tenant);
    }

    const memberships = await listPlatformMembershipsForUserInTenant(subject.userId, tenant);
    if (!memberships.length) return [];

    const roles = memberships.map((m) => m.role);
    const highest = pickHighestPlatformRole(roles);
    if (!highest) return [];

    return [...permissionsForRole(tenant, highest)];
  }

  /** @internal test helper — permissions for role without DB */
  permissionsForMembershipRole(tenant: TenantSlug, role: PlatformMembershipRole): PlatformPermission[] {
    return [...permissionsForRole(tenant, role)];
  }

  private assertEnabled(): void {
    if (!isPlatformFeatureEnabled("identity")) {
      throw new AuthorizationDisabledError();
    }
  }
}

export const defaultAuthorizationService = new DefaultAuthorizationService();

export { permissionAppliesInTenant, filterForTenant };
