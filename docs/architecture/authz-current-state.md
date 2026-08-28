# Authorization current state (Phase 8B inventory)

**Date:** 2026-08-28  
**Scope:** Brightline Photography ↔ MiroTech Solutions  
**Related:** [ADR-009](./ADR-009-central-identity.md), [ADR-010 RBAC](./ADR-010-rbac.md)

## Summary

Authorization is **layered and legacy-first**. Platform RBAC (`lib/platform/authorization/`) sits beside existing guards and is gated by `PLATFORM_IDENTITY_ENABLED` (default off). No production route has replaced `authorizeAdminRequest` or accountant permission flags.

---

## 1. Edge and middleware

| Layer | File | Mechanism |
| --- | --- | --- |
| CSP + CSRF + admin gate | `proxy.ts` | Non-GET mutations on `/api/admin`, `/api/studio`, `/api/accountant`, `/api/ai` require same-origin; `/admin`, `/studio`, `/api/admin`, `/api/studio` require `admin_access` cookie |
| CSRF contract | `lib/truth/security.ts` | Prefix list locked in truth module |

---

## 2. Admin / Studio (shared access code)

| Mechanism | File | Notes |
| --- | --- | --- |
| `authorizeAdminRequest` | `lib/admin-auth.ts` | ~170 `/api/admin/*` routes; HMAC `admin_access` cookie |
| `hasAdminAccess` | `lib/admin-auth.ts` | RSC pages under `/admin`, `/studio` |
| `guardAdminJson` | `lib/api/guards.ts` | Admin + CSRF combined |
| `rejectCrossSiteMutation` | `lib/admin-request-origin.ts` | Defense-in-depth in hub/image-port/r2 routes |
| Login | `app/api/admin/login/route.ts` | Single shared `ADMIN_ACCESS_CODE` |

**No per-user roles** — one operator pool for Mission Control + Studio OS.

---

## 3. Accountant portal

| Mechanism | File | Notes |
| --- | --- | --- |
| JWT session | `lib/accountant/auth.ts` | `accountant_session` cookie |
| `assertPermission(ctx, flag)` | `lib/accountant/auth.ts` | 12 boolean flags on `AccountantPermission` |
| Owner bypass | `lib/accountant/auth.ts` | Valid admin cookie → synthetic full permissions |
| Page guards | `app/accountant/(portal)/*` | Redirect + nav visibility by flag |
| Platform link bootstrap | `lib/platform/identity/link-legacy.ts` | Non-blocking on login when identity flag on |

---

## 4. Client / delivery access

| Mechanism | File | Routes |
| --- | --- | --- |
| Gallery access code + HMAC session | `lib/client-access.ts`, `lib/client-gallery-session.ts` | `/api/client/gallery`, download, selection |
| Delivery package token | `lib/client-api/delivery-package.ts` | `/api/package/[accessToken]/*` |
| Final package token | `lib/final-package-access.ts` | `/api/final-package/[token]/*` |
| Contract documents | `lib/contracts/client-access.ts` | `/api/client/documents/[token]/*` |

**Not** mapped to `PlatformUser` — client access stays separate (ADR-009).

---

## 5. Automation / cron / machine auth

| Mechanism | File | Notes |
| --- | --- | --- |
| `requireProjectsApiAuth` | `lib/api/automation-auth.ts` | Admin cookie OR automation bearer |
| `guardCronBearer` | `lib/api/guards.ts` | `CRON_SECRET` for cron routes |
| Mirotech handoff | `lib/mirotech-admin-handoff.ts` | Short-lived HMAC SSO from admin session |

---

## 6. Media key policy

| Mechanism | File | Notes |
| --- | --- | --- |
| Public vs private prefixes | `lib/media-key-access.ts` | `/api/media/public` allowlist |
| Admin signing | `app/api/admin/media/sign/route.ts` | `guardAdminJson` + key check |

---

## 7. Platform RBAC (Phase 8B — beside legacy)

| Module | Purpose |
| --- | --- |
| `lib/platform/authorization/permissions.ts` | Stable permission catalog |
| `lib/platform/authorization/role-permissions.ts` | Role → permission sets per tenant |
| `lib/platform/authorization/default-authorization-service.ts` | `can()`, `requirePermission()`, `listPermissions()` |
| `lib/platform/authorization/agent-scopes.ts` | Future agent scope presets (no agents yet) |
| `lib/platform/identity/` | PlatformUser, membership, legacy links |

**Dual-auth probe routes (controlled test only):**

- `GET /api/admin/platform/identity/me` — legacy admin cookie **+** `platform.identity.read`
- `GET /api/admin/platform/authorization/me?tenant=brightline|mirotech` — effective permissions list

---

## 8. Hard-coded patterns (grep baseline)

- `authorizeAdminRequest` — primary API guard
- `requireAdmin` — **not used**
- `isAdmin` — upload sign helper only
- Platform `hasTenantRole` / `AuthorizationService` — opt-in probe routes only
