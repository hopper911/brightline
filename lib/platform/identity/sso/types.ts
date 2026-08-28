import type { TenantSlug } from "@/lib/platform/tenants/types";

export const SSO_TOKEN_VERSION = "sso1" as const;

export const SSO_EXCHANGE_TTL_SEC = 90;
export const SSO_EXCHANGE_TTL_MAX_SEC = 120;
export const SSO_EXCHANGE_TTL_MIN_SEC = 30;

/** Cross-domain staff SSO audiences — tenant slugs. */
export type SsoAudience = TenantSlug;

export type SsoExchangeClaims = {
  version: typeof SSO_TOKEN_VERSION;
  issuer: SsoAudience;
  audience: SsoAudience;
  exp: number;
  nonce: string;
  userId: string;
  state: string;
  returnTo: string;
};

export type SsoExchangeStartInput = {
  issuer: SsoAudience;
  audience: SsoAudience;
  userId: string;
  returnTo: string;
  state: string;
  ttlSec?: number;
};

export type SsoRedeemResult =
  | {
      ok: true;
      userId: string;
      issuer: SsoAudience;
      audience: SsoAudience;
      returnTo: string;
    }
  | {
      ok: false;
      reason:
        | "disabled"
        | "not_configured"
        | "invalid_token"
        | "expired"
        | "replay"
        | "wrong_audience"
        | "state_mismatch"
        | "invalid_redirect"
        | "user_not_found"
        | "user_inactive"
        | "missing_membership"
        | "wrong_tenant";
    };

export type SsoResolvedStaff = {
  userId: string;
  email: string | null;
  memberships: Array<{ tenantSlug: TenantSlug; role: string }>;
};
