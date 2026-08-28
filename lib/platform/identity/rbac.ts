import type { PlatformMembershipRole } from "@/lib/platform/identity/types";

/** Higher rank = more privilege. */
export const PLATFORM_ROLE_RANK: Record<PlatformMembershipRole, number> = {
  VIEWER: 1,
  EDITOR: 2,
  ADMIN: 3,
  OWNER: 4,
};

export function hasMinPlatformRole(
  actual: PlatformMembershipRole,
  required: PlatformMembershipRole
): boolean {
  return PLATFORM_ROLE_RANK[actual] >= PLATFORM_ROLE_RANK[required];
}

export function pickHighestPlatformRole(
  roles: PlatformMembershipRole[]
): PlatformMembershipRole | null {
  if (!roles.length) return null;
  return roles.reduce((best, role) =>
    PLATFORM_ROLE_RANK[role] > PLATFORM_ROLE_RANK[best] ? role : best
  );
}
