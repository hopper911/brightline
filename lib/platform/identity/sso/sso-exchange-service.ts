import "server-only";

import { recordAuditSafely } from "@/lib/platform/audit/record-safely";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import { isPlatformSsoConfigured, ssoAuthorityOriginForAudience } from "@/lib/platform/identity/sso/config";
import { createSsoExchangeToken, verifySsoExchangeToken } from "@/lib/platform/identity/sso/exchange-token";
import {
  type SsoNonceStore,
  resolveSsoNonceStore,
} from "@/lib/platform/identity/sso/nonce-store";
import { sanitizeSsoReturnPath } from "@/lib/platform/identity/sso/redirect-allowlist";
import { resolveSsoStaffIdentity } from "@/lib/platform/identity/sso/resolve-sso-staff";
import type {
  SsoAudience,
  SsoExchangeStartInput,
  SsoRedeemResult,
} from "@/lib/platform/identity/sso/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";

async function auditSsoEvent(input: {
  tenant: TenantSlug;
  action: "identity.sso.started" | "identity.sso.completed" | "identity.sso.failed";
  userId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditSafely({
    context: createPlatformContextForTenant(input.tenant),
    actor: input.userId ? { type: "USER", id: input.userId } : { type: "SYSTEM" },
    action: input.action,
    resource: { type: "sso_exchange", id: input.userId ?? "anonymous" },
    metadata: input.metadata,
  });
}

export type StartSsoExchangeResult =
  | {
      ok: true;
      redirectUrl: string;
      state: string;
    }
  | {
      ok: false;
      reason: "disabled" | "not_configured" | "invalid_target" | "invalid_return";
    };

export class SsoExchangeService {
  constructor(private readonly nonceStore: SsoNonceStore = resolveSsoNonceStore()) {}

  assertAvailable(): { ok: true } | { ok: false; reason: "disabled" | "not_configured" } {
    if (!isPlatformFeatureEnabled("identity")) return { ok: false, reason: "disabled" };
    if (!isPlatformSsoConfigured()) return { ok: false, reason: "not_configured" };
    return { ok: true };
  }

  async startExchange(input: {
    issuer: SsoAudience;
    audience: SsoAudience;
    userId: string;
    returnTo: string;
    state: string;
  }): Promise<StartSsoExchangeResult> {
    const gate = this.assertAvailable();
    if (!gate.ok) return { ok: false, reason: gate.reason };

    if (input.issuer === input.audience) {
      return { ok: false, reason: "invalid_target" };
    }

    const safeReturn = sanitizeSsoReturnPath(input.returnTo, input.audience);
    if (safeReturn !== input.returnTo && !input.returnTo.startsWith("/")) {
      return { ok: false, reason: "invalid_return" };
    }

    const token = createSsoExchangeToken({
      issuer: input.issuer,
      audience: input.audience,
      userId: input.userId,
      returnTo: safeReturn,
      state: input.state,
    } satisfies SsoExchangeStartInput);

    if (!token) return { ok: false, reason: "not_configured" };

    await auditSsoEvent({
      tenant: input.issuer,
      action: "identity.sso.started",
      userId: input.userId,
      metadata: {
        audience: input.audience,
        issuer: input.issuer,
      },
    });

    const authority = ssoAuthorityOriginForAudience(input.audience);
    const redirectUrl = `${authority}/api/platform/sso/redeem?token=${encodeURIComponent(token)}&state=${encodeURIComponent(input.state)}`;

    return { ok: true, redirectUrl, state: input.state };
  }

  async redeemExchange(input: {
    token: string;
    state: string;
    expectedState: string | null;
    siteAudience: SsoAudience;
  }): Promise<SsoRedeemResult & { staff?: Awaited<ReturnType<typeof resolveSsoStaffIdentity>> }> {
    const gate = this.assertAvailable();
    if (!gate.ok) return { ok: false, reason: gate.reason };

    if (!input.expectedState || input.expectedState !== input.state) {
      await auditSsoEvent({
        tenant: input.siteAudience,
        action: "identity.sso.failed",
        metadata: { reason: "state_mismatch", audience: input.siteAudience },
      });
      return { ok: false, reason: "state_mismatch" };
    }

    const verified = verifySsoExchangeToken(input.token);
    if (!verified.ok) {
      await auditSsoEvent({
        tenant: input.siteAudience,
        action: "identity.sso.failed",
        metadata: { reason: "invalid_token", audience: input.siteAudience },
      });
      return { ok: false, reason: "invalid_token" };
    }

    const { claims } = verified;
    if (claims.audience !== input.siteAudience) {
      await auditSsoEvent({
        tenant: input.siteAudience,
        action: "identity.sso.failed",
        userId: claims.userId,
        metadata: { reason: "wrong_audience", expected: input.siteAudience, got: claims.audience },
      });
      return { ok: false, reason: "wrong_audience" };
    }

    if (claims.state !== input.state) {
      await auditSsoEvent({
        tenant: input.siteAudience,
        action: "identity.sso.failed",
        userId: claims.userId,
        metadata: { reason: "state_mismatch" },
      });
      return { ok: false, reason: "state_mismatch" };
    }

    const returnTo = sanitizeSsoReturnPath(claims.returnTo, claims.audience);

    const consumed = await this.nonceStore.consume({
      nonce: claims.nonce,
      audience: claims.audience,
      issuer: claims.issuer,
      userId: claims.userId,
      expiresAt: new Date(claims.exp * 1000),
    });

    if (!consumed) {
      await auditSsoEvent({
        tenant: input.siteAudience,
        action: "identity.sso.failed",
        userId: claims.userId,
        metadata: { reason: "replay", audience: claims.audience },
      });
      return { ok: false, reason: "replay" };
    }

    const staff = await resolveSsoStaffIdentity(claims.userId, claims.audience);
    if (!staff.ok) {
      await auditSsoEvent({
        tenant: input.siteAudience,
        action: "identity.sso.failed",
        userId: claims.userId,
        metadata: { reason: staff.reason, audience: claims.audience },
      });
      return { ok: false, reason: staff.reason };
    }

    await auditSsoEvent({
      tenant: input.siteAudience,
      action: "identity.sso.completed",
      userId: claims.userId,
      metadata: {
        audience: claims.audience,
        issuer: claims.issuer,
        membershipCount: staff.staff.memberships.length,
      },
    });

    return {
      ok: true,
      userId: claims.userId,
      issuer: claims.issuer,
      audience: claims.audience,
      returnTo,
      staff,
    };
  }
}

export const ssoExchangeService = new SsoExchangeService();
