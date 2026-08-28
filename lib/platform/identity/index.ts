export type { IdentityService, PlatformIdentityService } from "@/lib/platform/identity/identity-service";
export {
  IdentityError,
  IdentityDisabledError,
  IdentityNotFoundError,
  isIdentityError,
  type IdentityErrorCode,
} from "@/lib/platform/identity/errors";
export {
  PLATFORM_LEGACY_IDENTITY_KINDS,
  PLATFORM_MEMBERSHIP_ROLES,
  PLATFORM_USER_STATUSES,
  isPlatformLegacyIdentityKind,
  isPlatformMembershipRole,
  isPlatformUserStatus,
  normalizePlatformEmail,
  type LegacyIdentityInput,
  type PlatformLegacyIdentityKind,
  type PlatformMembershipRecord,
  type PlatformMembershipRole,
  type PlatformUserRecord,
  type PlatformUserStatus,
  type ServicePrincipalKind,
} from "@/lib/platform/identity/types";
