# SSO current state (Phase 8C)

**Date:** 2026-08-28  
**Related:** [ADR-011](./ADR-011-parallel-sso.md), [ADR-009](./ADR-009-central-identity.md)

## Summary

Parallel staff SSO is **opt-in** behind `PLATFORM_IDENTITY_ENABLED` + `PLATFORM_SSO_EXCHANGE_SECRET`. Legacy admin login, accountant JWT, and Mirotech **handoff tokens (`ho1`)** are unchanged.

Cross-domain constraint: `brightlinephotography.com` and `mirotech.solutions` cannot share cookies — SSO uses a **short-lived HMAC exchange** (`sso1`) plus optional `platform_staff_session` cookie (`ps1`) on each site.

---

## Strategy (no third-party IdP)

| Option | Phase 8C decision |
| --- | --- |
| NextAuth / Auth.js | Stub only — not used for production admin |
| Third-party OIDC | Deferred — not required for parallel rollout |
| **HMAC exchange (`sso1`)** | **Selected** — separate from handoff (`ho1`), audience-bound, single-use nonce |
| Shared cookie | **Rejected** — different registrable domains |

---

## Central authority

No new `auth.*` subdomain deployed in 8C.

**Authority concept:** the **existing Mirotech deploy** (`mirotech.solutions`) acts as identity exchange receiver for Brightline-bound tokens, and vice versa when the same module is deployed on both Vercel projects.

Redeem endpoint (both sites): `GET /api/platform/sso/redeem`

---

## Routes (Brightline)

| Route | Purpose |
| --- | --- |
| `GET /api/admin/platform/sso/status` | Probe — SSO available? staff session present? |
| `GET /api/admin/platform/sso/start?target=mirotech&returnTo=/admin/...` | Opt-in outbound SSO (requires legacy admin + staff session) |
| `GET /api/platform/sso/redeem` | Cross-domain callback — sets `platform_staff_session` |

Legacy fallback when no staff session: JSON `409` with `legacyHandoffPath` → `/api/admin/mirotech/handoff`.

---

## Module layout

`lib/platform/identity/sso/`

| File | Role |
| --- | --- |
| `exchange-token.ts` | Mint / verify `sso1` tokens |
| `nonce-store.ts` | Single-use replay protection (Postgres + memory) |
| `redirect-allowlist.ts` | `/admin` + `/studio` paths; origin allowlist |
| `platform-staff-session.ts` | `ps1` staff cookie (separate from `admin_access`) |
| `sso-exchange-service.ts` | Start / redeem orchestration + audit |
| `resolve-sso-staff.ts` | PlatformUser + membership + permissions |

---

## Env

| Variable | Required for SSO |
| --- | --- |
| `PLATFORM_IDENTITY_ENABLED=true` | Yes |
| `PLATFORM_SSO_EXCHANGE_SECRET` (32+ chars, both deploys) | Yes |
| `PLATFORM_SSO_NONCE_STORE=memory` | Optional local dev |

---

## Audit actions

- `identity.sso.started`
- `identity.sso.completed`
- `identity.sso.failed`

Tokens never stored in audit metadata (sanitizer redacts `sso1.` / `ps1.`).

---

## Not in scope (8C)

- Forced SSO cutover
- Removing login pages
- Replacing handoff tokens
- Admin shared-code → PlatformUser mapping (still unmapped unless staff session exists)
