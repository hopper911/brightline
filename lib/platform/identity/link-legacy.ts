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

/** Shared Brightline admin access code maps to one PlatformUser (no per-operator id in cookie). */
export const ADMIN_ACCESS_LEGACY_REF_ID = "shared" as const;

const DEFAULT_ADMIN_MEMBERSHIP_TENANTS: readonly TenantSlug[] = ["brightline", "mirotech"];

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

export type EnsureAdminPlatformUserResult = {
  user: PlatformUserRecord;
  created: boolean;
  linked: boolean;
};

/**
 * Bootstrap PlatformUser for shared Brightline admin access (Phase 8D-A).
 * Uses ADMIN_EMAIL when set; non-blocking for login — legacy admin cookie unchanged.
 */
export async function ensureAdminPlatformUser(input?: {
  email?: string | null;
  name?: string | null;
  role?: PlatformMembershipRole;
}): Promise<EnsureAdminPlatformUserResult | null> {
  if (!isPlatformFeatureEnabled("identity")) {
    return null;
  }

  const email = normalizePlatformEmail(
    input?.email?.trim() || process.env.ADMIN_EMAIL?.trim() || ""
  );
  if (!email) return null;

  const role = input?.role ?? "OWNER";

  const existingLink = await findPlatformUserByLegacyLink(
    "admin_access",
    ADMIN_ACCESS_LEGACY_REF_ID
  );
  if (existingLink) {
    for (const tenantSlug of DEFAULT_ADMIN_MEMBERSHIP_TENANTS) {
      await upsertPlatformMembership({ userId: existingLink.id, tenantSlug, role });
    }
    return { user: existingLink, created: false, linked: false };
  }

  let user = await findPlatformUserByEmail(email);
  let created = false;
  if (!user) {
    user = await createPlatformUser({ email, name: input?.name ?? null, status: "ACTIVE" });
    created = true;
  }

  await createPlatformLegacyIdentityLink({
    userId: user.id,
    legacyKind: "admin_access",
    legacyRefId: ADMIN_ACCESS_LEGACY_REF_ID,
  });

  for (const tenantSlug of DEFAULT_ADMIN_MEMBERSHIP_TENANTS) {
    await upsertPlatformMembership({ userId: user.id, tenantSlug, role });
  }

  return { user, created, linked: true };
}
