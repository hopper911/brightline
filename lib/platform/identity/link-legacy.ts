import "server-only";

import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import {
  createPlatformLegacyIdentityLink,
  createPlatformUser,
  findPlatformUserByEmail,
  findPlatformUserByLegacyLink,
  upsertPlatformMembership,
} from "@/lib/platform/identity/repository";
import type { PlatformMembershipRole, PlatformUserRecord } from "@/lib/platform/identity/types";
import { normalizePlatformEmail } from "@/lib/platform/identity/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";

export type EnsureAccountantPlatformUserResult = {
  user: PlatformUserRecord;
  created: boolean;
  linked: boolean;
  membershipCreated: boolean;
};

/**
 * Bootstrap PlatformUser + legacy link for an accountant login (Phase 8B).
 * Non-blocking — callers should catch/log failures; legacy auth continues unchanged.
 */
export async function ensureAccountantPlatformUser(input: {
  accountantAccessId: string;
  email: string;
  name?: string | null;
  tenantSlug?: TenantSlug;
  role?: PlatformMembershipRole;
}): Promise<EnsureAccountantPlatformUserResult | null> {
  if (!isPlatformFeatureEnabled("identity")) {
    return null;
  }

  const accountantAccessId = input.accountantAccessId.trim();
  const email = normalizePlatformEmail(input.email);
  if (!accountantAccessId || !email) return null;

  const tenantSlug = input.tenantSlug ?? "brightline";
  const role = input.role ?? "EDITOR";

  const existingLink = await findPlatformUserByLegacyLink("accountant_access", accountantAccessId);
  if (existingLink) {
    await upsertPlatformMembership({
      userId: existingLink.id,
      tenantSlug,
      role,
    });
    return {
      user: existingLink,
      created: false,
      linked: false,
      membershipCreated: false,
    };
  }

  let user = await findPlatformUserByEmail(email);
  let created = false;
  if (!user) {
    user = await createPlatformUser({ email, name: input.name ?? null, status: "ACTIVE" });
    created = true;
  }

  const linked = await createPlatformLegacyIdentityLink({
    userId: user.id,
    legacyKind: "accountant_access",
    legacyRefId: accountantAccessId,
  });

  const membership = await upsertPlatformMembership({
    userId: user.id,
    tenantSlug,
    role,
  });

  return {
    user,
    created,
    linked,
    membershipCreated: Boolean(membership),
  };
}
