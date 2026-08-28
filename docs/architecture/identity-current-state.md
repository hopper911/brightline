# Identity & authentication — current state (Phase 8A inventory)

**Date:** 2026-08-28  
**Scope:** Brightline Photography repo (`brightline/`)

## Summary

Authentication is **fragmented by surface** — there is no central `User` table or SSO. Phase 8A adds **`PlatformUser` + membership contracts beside legacy systems** without changing login behavior.

**Staff/operator identity** and **client gallery access** are intentionally separate.

---

## Human admin / operator identity

| Surface | Mechanism | Session | Identity record |
| --- | --- | --- | --- |
| **Brightline admin** | Shared access code → HMAC cookie | `admin_access` (`v1.exp.nonce.sig`, 8h) | None — no per-user id |
| **Studio OS** | Same `admin_access` cookie | Same | None |
| **Accountant portal** | Email + password → JWT | `accountant_session` (jose HS256, 8h) | `AccountantAccess` |
| **Accountant via admin** | `admin_access` → synthetic owner | Admin cookie | None |
| **Mirotech admin** | Handoff from Brightline admin | Mirotech deploy sets own session | None in this repo |
| **Automation** | Bearer `AUTOMATION_API_SECRET` / `BL_INTERNAL_API_TOKEN` | None | None |

**Key modules:** `lib/admin-auth.ts`, `lib/admin-session.ts`, `lib/accountant/auth.ts`, `lib/mirotech-admin-handoff.ts`, `lib/api/automation-auth.ts`

**Env:** `ADMIN_ACCESS_CODE`, `ADMIN_SESSION_SECRET`, `ACCOUNTANT_SESSION_SECRET`, `MIROTECH_ADMIN_HANDOFF_SECRET`, `CONTENT_API_SECRET`, `AUTOMATION_API_SECRET`

---

## Client / delivery access (NOT staff identity)

| Surface | Mechanism | Session / token |
| --- | --- | --- |
| **Client gallery** | Hashed access code per gallery | `client_access_session` (HMAC bound to `GalleryAccessToken.id`) |
| **Delivery package** | Opaque URL token | `DeliveryPackage.accessToken` — no login |
| **Final package** | Opaque URL token | `WorkProject.finalPackageToken` — no login |

**Key modules:** `lib/client-access.ts`, `lib/client-gallery-session.ts`, `lib/final-package-access.ts`

**Env:** `CLIENT_GALLERY_SESSION_SECRET`

Client access codes must **not** be merged into `PlatformUser` in Phase 8A.

---

## NextAuth / Auth.js

- Route: `app/api/auth/[...nextauth]/route.ts`
- Config: `lib/auth.ts` — Credentials provider always returns `null`
- **Not used** for production auth

---

## Edge / middleware

- **`proxy.ts`** (no `middleware.ts`): CSP nonce, CSRF on operator API prefixes, admin cookie gate on `/admin`, `/studio`, `/api/admin`, `/api/studio`
- CSRF prefixes locked in `lib/truth/security.ts`
- **`/accountant`**: layout + per-route auth (not full edge gate in current `proxy.ts`)

---

## Prisma models (existing)

| Model | Role |
| --- | --- |
| `Client` | CRM contact — not login |
| `AccountantAccess` | Finance portal identity (scoped) |
| `GalleryAccessToken` | Client gallery codes |
| `PlatformTenant` | Tenant anchor (`brightline`, `mirotech`) — not users |

**No general `User` / `PlatformUser` table before Phase 8A.**

---

## JWT vs HMAC

| System | Format |
| --- | --- |
| Accountant | JWT (`jose`) |
| Admin, client gallery, Mirotech handoff | Custom HMAC tokens (not JWT) |

---

## Platform migration flag

| Env | Default | Phase 8A |
| --- | --- | --- |
| `PLATFORM_IDENTITY_ENABLED` | off | Gates `IdentityService` only — no login changes |

---

## Gaps Phase 8A addresses

1. `PlatformUser` + `PlatformMembership` (additive DB)
2. `IdentityService` contract (`findUser`, `getMemberships`, `resolveLegacyIdentity`)
3. `resolvePlatformUserFromLegacySession()` — optional mapping, returns `null` when unmapped
4. ADR-009 — identity vs authentication, legacy coexistence, future SSO/RBAC

## Phase 8B candidates (not in 8A)

- Fine-grained RBAC permissions
- Explicit legacy link bootstrap (accountant → PlatformUser)
- Audit actor enrichment from PlatformUser id
- SSO provider integration
