export {
  DefaultIdentityService,
  defaultIdentityService,
} from "@/lib/platform/identity/default-identity-service";
export {
  resolvePlatformUserFromLegacySession,
  type LegacySessionInput,
} from "@/lib/platform/identity/legacy-resolver";
export { ssoExchangeService } from "@/lib/platform/identity/sso/sso-exchange-service";
export { isPlatformSsoEnabled, isPlatformSsoConfigured } from "@/lib/platform/identity/sso/config";
