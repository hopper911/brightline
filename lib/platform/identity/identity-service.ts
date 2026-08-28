import type { PlatformContext } from "@/lib/platform/context/types";
import type {
  LegacyIdentityInput,
  PlatformMembershipRecord,
  PlatformMembershipRole,
  PlatformUserRecord,
} from "@/lib/platform/identity/types";

/**
 * Platform identity boundary (Phase 8A).
 * Does not authenticate — callers must verify sessions first.
 */
export interface IdentityService {
  findUserById(context: PlatformContext, userId: string): Promise<PlatformUserRecord | null>;
  findUserByEmail(context: PlatformContext, email: string): Promise<PlatformUserRecord | null>;
  getMemberships(context: PlatformContext, userId: string): Promise<PlatformMembershipRecord[]>;
  resolveLegacyIdentity(
    context: PlatformContext,
    input: LegacyIdentityInput
  ): Promise<PlatformUserRecord | null>;
  hasTenantRole(
    context: PlatformContext,
    userId: string,
    minRole: PlatformMembershipRole
  ): Promise<boolean>;
}

export type PlatformIdentityService = IdentityService;
