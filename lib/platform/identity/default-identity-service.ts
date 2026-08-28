import "server-only";

import type { PlatformContext } from "@/lib/platform/context/types";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import { IdentityDisabledError } from "@/lib/platform/identity/errors";
import type { IdentityService } from "@/lib/platform/identity/identity-service";
import {
  findPlatformUserByEmail,
  findPlatformUserById,
  findPlatformUserByLegacyLink,
  listPlatformMembershipsForUserInTenant,
} from "@/lib/platform/identity/repository";
import type { LegacyIdentityInput, PlatformMembershipRecord, PlatformMembershipRole, PlatformUserRecord } from "@/lib/platform/identity/types";
import { hasMinPlatformRole } from "@/lib/platform/identity/rbac";

/**
 * Default IdentityService — read-only identity lookups (Phase 8A).
 *
 * Gated by PLATFORM_IDENTITY_ENABLED. Does not replace or validate legacy auth.
 */
export class DefaultIdentityService implements IdentityService {
  async findUserById(_context: PlatformContext, userId: string): Promise<PlatformUserRecord | null> {
    this.assertEnabled();
    const id = userId.trim();
    if (!id) return null;
    return findPlatformUserById(id);
  }

  async findUserByEmail(_context: PlatformContext, email: string): Promise<PlatformUserRecord | null> {
    this.assertEnabled();
    return findPlatformUserByEmail(email);
  }

  async getMemberships(context: PlatformContext, userId: string): Promise<PlatformMembershipRecord[]> {
    this.assertEnabled();
    const id = userId.trim();
    if (!id) return [];
    return listPlatformMembershipsForUserInTenant(id, context.tenant.slug);
  }

  async resolveLegacyIdentity(
    context: PlatformContext,
    input: LegacyIdentityInput
  ): Promise<PlatformUserRecord | null> {
    this.assertEnabled();
    void context;

    if (input.kind === "admin_access" || input.kind === "automation_bearer") {
      return null;
    }

    if (input.kind === "accountant_access") {
      const ref = input.accountantAccessId.trim();
      if (!ref) return null;
      return findPlatformUserByLegacyLink("accountant_access", ref);
    }

    return null;
  }

  async hasTenantRole(
    context: PlatformContext,
    userId: string,
    minRole: PlatformMembershipRole
  ): Promise<boolean> {
    this.assertEnabled();
    const id = userId.trim();
    if (!id) return false;
    const memberships = await listPlatformMembershipsForUserInTenant(id, context.tenant.slug);
    return memberships.some((m) => hasMinPlatformRole(m.role, minRole));
  }

  private assertEnabled(): void {
    if (!isPlatformFeatureEnabled("identity")) {
      throw new IdentityDisabledError();
    }
  }
}

export const defaultIdentityService = new DefaultIdentityService();
