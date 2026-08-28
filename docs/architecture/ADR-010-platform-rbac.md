# ADR-010: Platform RBAC and Legacy Linking

**Status:** Accepted  
**Date:** 2026-08-28  
**Depends on:** [ADR-009](./ADR-009-central-identity.md)

## Context

Phase 8A introduced `PlatformUser`, `PlatformMembership`, and optional `PlatformLegacyIdentityLink` without changing runtime auth. Operators still authenticate via legacy cookies/JWT; identity lookups return `null` when unmapped.

Phase 8B adds:

- Role hierarchy helpers for future route guards
- Write-path bootstrap linking for accountant logins
- `IdentityService.hasTenantRole()` for coarse tenant RBAC checks

Admin shared-code login still has no natural `PlatformUser` mapping.

## Decision

### Role hierarchy

```typescript
VIEWER < EDITOR < ADMIN < OWNER
```

`hasMinPlatformRole(actual, required)` in `lib/platform/identity/rbac.ts`.

`DefaultIdentityService.hasTenantRole(context, userId, minRole)` returns true when the user has any membership in the **context tenant** meeting the minimum role.

### Accountant bootstrap linking

On successful accountant login (when `PLATFORM_IDENTITY_ENABLED`):

1. Look up existing `accountant_access` legacy link
2. Else find/create `PlatformUser` by email
3. Create legacy link row
4. Upsert `brightline` membership (default role: `EDITOR`)

Failures are logged and **non-blocking** — accountant JWT login is unchanged.

### Admin identity probe

`GET /api/admin/platform/identity/me` — returns mapped user + memberships when identity flag is on. Admin cookie sessions typically return `user: null`.

### No global RBAC enforcement yet

Existing admin/studio/accountant guards remain authoritative. RBAC helpers are opt-in for new platform routes only.

## Consequences

**Positive**

- Accountant emails gradually accumulate platform identity without migration scripts
- RBAC primitives ready for audit actor enrichment and cross-tenant admin

**Negative**

- Auto-link on login is brightline-tenant only until product defines mirotech accountant scope
- Admin operators remain unmapped until explicit product decision

## Rollback

Set `PLATFORM_IDENTITY_ENABLED=false`. Remove login hook and 8B write helpers. Legacy auth unaffected.
