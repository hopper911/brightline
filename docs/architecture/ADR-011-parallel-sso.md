# ADR-011: Parallel Cross-Domain Staff SSO (Phase 8C)

**Status:** Accepted  
**Date:** 2026-08-28  
**Depends on:** [ADR-009](./ADR-009-central-identity.md), [ADR-010 RBAC](./ADR-010-rbac.md)  
**Inventory:** [sso-current-state.md](./sso-current-state.md)

## Context

Brightline and MiroTech operate on different registrable domains. Staff today authenticate via:

- Brightline/Mission Control/Studio: shared admin access code + HMAC cookie
- Cross-domain Mirotech admin: short-lived **handoff** token (`ho1`)
- Accountant portal: JWT + permission flags

Phase 8A/8B introduced `PlatformUser`, memberships, and RBAC beside legacy auth. Phase 8C adds **optional** cross-domain SSO that resolves platform identity without removing legacy paths.

## Decision

### Auth strategy

Reuse **existing deploys** as exchange authorities — do **not** introduce `auth.mirotech.solutions` or a third-party IdP in 8C.

NextAuth remains a stub. SSO uses a **new** exchange format (`sso1`) — handoff (`ho1`) is **not** extended for identity claims.

### Exchange mechanism

```
Issuer site (e.g. mirotech.solutions)
  └─ mint sso1 token (aud=brightline, userId, state, returnTo, nonce, exp)
       └─ redirect → https://brightlinephotography.com/api/platform/sso/redeem?token&state

Receiver (brightlinephotography.com)
  └─ verify HMAC + state cookie + single-use nonce
       └─ resolve PlatformUser + membership in aud tenant
            └─ set platform_staff_session (ps1) cookie
                 └─ redirect returnTo (/admin|/studio only)
```

### Security controls

| Control | Implementation |
| --- | --- |
| Short expiry | 30–120s TTL (default 90s) |
| Single-use | `platform_sso_exchange_nonces` table |
| Audience-bound | `aud` must match receiving site tenant |
| State / CSRF | `platform_sso_state` httpOnly cookie |
| Redirect allowlist | `/admin/*`, `/studio/*`; origins brightline + mirotech only |
| No token logging | Audit sanitizer redacts `sso1.` / `ps1.` |
| Separate secret | `PLATFORM_SSO_EXCHANGE_SECRET` ≠ handoff secret |

### PlatformUser resolution

On successful redeem:

1. Load `PlatformUser` by id from token
2. Require `ACTIVE` status
3. Require membership in **audience tenant**
4. Compute permissions via `AuthorizationService.listPermissions`

### Parallel mode / feature flag

SSO requires:

- `PLATFORM_IDENTITY_ENABLED=true`
- `PLATFORM_SSO_EXCHANGE_SECRET` (32+ chars on **both** deploys)

When off: legacy authentication only — no behavior change.

When on: SSO routes available; **legacy admin login and handoff remain**.

Outbound SSO from Brightline requires existing `platform_staff_session` (prior inbound SSO or future admin identity mapping). Otherwise API returns `409` with legacy handoff path.

### Legacy fallback (explicit)

- Admin login pages unchanged
- No automatic redirect to SSO
- Mirotech handoff route unchanged
- `authorizeAdminRequest` remains authoritative for admin APIs

## Consequences

**Positive**

- Cross-domain staff identity without shared cookies
- Clear separation from handoff tokens
- Audit trail for SSO lifecycle

**Negative**

- Two staff session cookies when SSO used (`admin_access` + `platform_staff_session`)
- Admin shared-code still unmapped until product decision (Phase 8D)
- Both Vercel projects must share `PLATFORM_SSO_EXCHANGE_SECRET`

## Rollback

Unset `PLATFORM_SSO_EXCHANGE_SECRET` or `PLATFORM_IDENTITY_ENABLED`. Remove SSO routes usage. Drop `platform_sso_exchange_nonces` when safe. Legacy auth unaffected.

## Future (Phase 8D)

- Admin email/OIDC adapter beside shared code
- Mirotech → Brightline inbound SSO UI entry
- Enforce RBAC on publishing routes when staff session present
- Deprecation plan for handoff (only after SSO parity proven)
