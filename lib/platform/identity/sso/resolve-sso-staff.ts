import "server-only";

import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import { defaultAuthorizationService } from "@/lib/platform/authorization/default-authorization-service";
import { findPlatformUserById } from "@/lib/platform/identity/repository";
import { listPlatformMembershipsForUserInTenant } from "@/lib/platform/identity/repository";
import type { SsoAudience, SsoResolvedStaff } from "@/lib/platform/identity/sso/types";

export async function resolveSsoStaffIdentity(
  userId: string,
  audience: SsoAudience
): Promise<
  | { ok: true; staff: SsoResolvedStaff; permissions: string[] }
  | { ok: false; reason: "user_not_found" | "user_inactive" | "missing_membership" }
> {
  const user = await findPlatformUserById(userId);
  if (!user) return { ok: false, reason: "user_not_found" };
  if (user.status !== "ACTIVE") return { ok: false, reason: "user_inactive" };

  const memberships = await listPlatformMembershipsForUserInTenant(userId, audience);
  if (!memberships.length) return { ok: false, reason: "missing_membership" };

  const context = createPlatformContextForTenant(audience);
  const permissions = await defaultAuthorizationService.listPermissions({
    subject: { kind: "user", userId },
    tenant: audience,
  });

  return {
    ok: true,
    staff: {
      userId: user.id,
      email: user.email,
      memberships: memberships.map((m) => ({
        tenantSlug: m.tenantSlug,
        role: m.role,
      })),
    },
    permissions,
  };
}
