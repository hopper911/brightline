# ADR-009: Central Platform Identity

**Status:** Accepted  
**Date:** 2026-08-28  
**Depends on:** [ADR-002](./ADR-002-tenant-context.md), [ADR-003](./ADR-003-audit-events.md), [ADR-001](./ADR-001-platform-foundation.md)  
**Inventory:** [identity-current-state.md](./identity-current-state.md)

## Context

Brightline and MiroTech share infrastructure but use **different authentication mechanisms**:

- Admin/Studio: shared access code + HMAC cookie (no user record)
- Accountant: email/password + JWT (`AccountantAccess`)
- Client galleries: hashed access codes (not staff)
- Mirotech admin: handoff token from Brightline admin session
- Automation: bearer secrets

There is no central user model, SSO, or cross-tenant RBAC. Future goals include unified operator identity, Studio agents, and cross-app admin access — without breaking production login in one step.

## Decision

Introduce **`lib/platform/identity/`** as the typed identity boundary **beside** legacy auth.

```
Legacy auth (unchanged)
  admin_access cookie ──┐
  accountant_session ───┼──► resolvePlatformUserFromLegacySession() ──► PlatformUser | null
  automation bearer ────┘         (optional mapping only)

PlatformUser ──► PlatformMembership ──► PlatformTenant
```

### Identity vs authentication

| Concern | Layer | Phase 8A |
| --- | --- | --- |
| **Authentication** | Proves access (cookies, JWT, codes) | **Unchanged** — existing modules |
| **Identity** | Stable user record + tenant memberships | **New** — contract + DB only |

Authentication modules (`admin-auth`, `accountant/auth`, `client-access`) do **not** delegate to `IdentityService` yet.

### PlatformUser

Additive Prisma model — **not** a duplicate of `AccountantAccess` or `Client`.

```typescript
type PlatformUserRecord = {
  id: string;
  email: string | null;
  name: string | null;
  status: "ACTIVE" | "INVITED" | "DISABLED";
  createdAt: Date;
  updatedAt: Date;
};
```

`AccountantAccess` remains the finance portal credential store until Phase 8B linking.

### PlatformMembership

One user → many tenants:

```typescript
type PlatformMembershipRecord = {
  id: string;
  userId: string;
  tenantSlug: TenantSlug;
  role: "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";
};
```

Roles are **minimal** in 8A. Fine-grained permissions (`AccountantPermission` flags, etc.) stay in domain modules until 8B.

### Client access separation

`GalleryAccessToken`, delivery package tokens, and final package tokens are **client/delivery access** — not `PlatformUser`. Do not merge gallery codes into staff identity.

### Legacy mapping strategy

`PlatformLegacyIdentityLink` maps legacy credentials to `PlatformUser` when explicitly created:

| `legacyKind` | `legacyRefId` | Default mapping (8A) |
| --- | --- | --- |
| `accountant_access` | `AccountantAccess.id` | Lookup when link row exists |
| `admin_access` | — | Always `null` — shared code has no user id |
| `automation_bearer` | — | Always `null` — service principal, not user |

`resolvePlatformUserFromLegacySession()`:

- Gated by `PLATFORM_IDENTITY_ENABLED`
- **Never** validates sessions — caller must authenticate first
- Returns `null` when no mapping (legacy auth still succeeds)

### Service / agent identities

Non-human actors use **audit actor types** (`SYSTEM`, `AGENT`, `SERVICE`) — not fake user emails.

Future **service principals** (automation jobs, AI agents) may get dedicated credential records in Phase 8B+. Do not model them as `PlatformUser` rows with synthetic emails in 8A.

### IdentityService contract

```typescript
interface IdentityService {
  findUserById(context, userId): Promise<PlatformUserRecord | null>;
  findUserByEmail(context, email): Promise<PlatformUserRecord | null>;
  getMemberships(context, userId): Promise<PlatformMembershipRecord[]>;
  resolveLegacyIdentity(context, input): Promise<PlatformUserRecord | null>;
}
```

Gated by `PLATFORM_IDENTITY_ENABLED` (default off). No login replacement.

### Security

Never log: session tokens, passwords, magic links, handoff tokens, JWT values.

### Database

Additive only:

- `platform_users`
- `platform_memberships`
- `platform_legacy_identity_links`

No changes to `AccountantAccess`, admin session format, or client gallery tables.

Existing sessions do **not** depend on `PlatformUser`.

## Consequences

**Positive**

- Foundation for SSO and cross-tenant RBAC
- Clear separation from client gallery access
- Legacy auth remains operational

**Negative**

- Mapping is manual/opt-in until 8B bootstrap tooling
- Admin shared-code login still has no natural PlatformUser without future product decision

## Rollback

Set `PLATFORM_IDENTITY_ENABLED=false`. Drop platform identity tables when no FKs reference them. Remove `lib/platform/identity/`. Zero runtime auth change.

## Future (Phase 8B+)

- Permission matrix / RBAC service
- Bootstrap links: accountant email → PlatformUser
- Enrich audit `actorId` from resolved PlatformUser
- SSO provider (OAuth/OIDC) as new auth adapter — not replacement of cookies in one step
