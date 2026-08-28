export type {
  SsoAudience,
  SsoExchangeClaims,
  SsoExchangeStartInput,
  SsoRedeemResult,
  SsoResolvedStaff,
} from "@/lib/platform/identity/sso/types";
export {
  brightlineSiteOrigin,
  isPlatformSsoConfigured,
  isPlatformSsoEnabled,
  siteOriginForTenant,
  ssoAuthorityOriginForAudience,
} from "@/lib/platform/identity/sso/config";
export { createSsoExchangeToken, verifySsoExchangeToken } from "@/lib/platform/identity/sso/exchange-token";
export {
  sanitizeSsoReturnPath,
  isAllowedSsoRedirectOrigin,
  currentSiteAudienceFromHost,
} from "@/lib/platform/identity/sso/redirect-allowlist";
export { SsoExchangeService, ssoExchangeService } from "@/lib/platform/identity/sso/sso-exchange-service";
export { resolveSsoStaffIdentity } from "@/lib/platform/identity/sso/resolve-sso-staff";
