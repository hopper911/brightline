# ADR-010: Platform RBAC and Scoped Permissions

**Status:** Accepted  
**Date:** 2026-08-28  
**Depends on:** [ADR-009](./ADR-009-central-identity.md)  
**Inventory:** [authz-current-state.md](./authz-current-state.md)  
**Supersedes:** [ADR-010-platform-rbac.md](./ADR-010-platform-rbac.md) (linking-only slice — merged here)

## Context

Brightline uses multiple parallel auth systems (admin cookie, accountant JWT + flags, client tokens, automation bearers). Phase 8A added `PlatformUser` / `PlatformMembership` without enforcing permissions on routes.

Phase 8B introduces an **explicit permission catalog** and `AuthorizationService` **beside** legacy checks. Existing guards remain authoritative until a deliberate cutover phase.

## Decision

### Permission catalog

Stable dot-notation identifiers in `lib/platform/authorization/permissions.ts`:

| Namespace | Examples |
| --- | --- |
| `brightline.*` | `gallery.read`, `gallery.write`, `client.manage`, `journal.publish` |
| `mirotech.*` | `project.read`, `project.write`, `case-study.draft`, `case-study.publish`, `journal.publish` |
| `platform.*` | `media.read`, `media.write`, `audit.read`, `identity.read`, `identity.manage` |

~20 permissions total — mapped to capabilities already present in admin, studio hub, and accountant surfaces.

### Role mapping

Roles (`VIEWER` < `EDITOR` < `ADMIN` < `OWNER`) map to permission sets **per tenant** in `role-permissions.ts`. Permissions are stored on roles, not duplicated on every user row.

- **VIEWER** — read gallery/project/journal + `platform.media.read`
- **EDITOR** — write + draft (`mirotech.case-study.draft`) + `platform.media.write`
- **ADMIN** — publish + client manage + `platform.audit.read` + `platform.identity.read`
- **OWNER** — + `platform.identity.manage`

### AuthorizationService

```typescript
authorization.can({ subject, tenant, permission }) → boolean
authorization.requirePermission({ subject, tenant, permission }) → void | PermissionDeniedError
authorization.listPermissions({ subject, tenant }) → PlatformPermission[]
```

Gated by `PLATFORM_IDENTITY_ENABLED` (default off).

**Subjects:**

| Kind | Use |
| --- | --- |
| `user` | PlatformUser id + tenant membership |
| `legacy_admin` | Synthetic OWNER grant for dual-auth probes only — **does not replace** `authorizeAdminRequest` |
| `agent` | Explicit scope list (future) |

### Tenant scoping

- `brightline.*` permissions require **brightline** tenant membership (or legacy_admin probe in brightline context).
- `mirotech.*` permissions require **mirotech** tenant membership.
- `platform.*` permissions are evaluated in the **context tenant** membership.
- A Brightline EDITOR does **not** receive MiroTech write/publish capabilities without a mirotech membership.

### Agent scopes (future)

`agent-scopes.ts` defines preset scope bundles, e.g.:

- `caseStudyDrafter` — `mirotech.case-study.draft`, `platform.media.read` (no publish)
- `mediaReader` — `platform.media.read`, `platform.audit.read`

No AI agent runtime in 8B — scopes are typed and tested only.

### No enforcement cutover

**Existing checks are NOT replaced.** One controlled dual-auth test:

1. `authorizeAdminRequest` (legacy) — required
2. `requirePermission(..., platform.identity.read)` (platform) — when identity flag on

Routes: `GET /api/admin/platform/identity/me`, `GET /api/admin/platform/authorization/me`.

Accountant bootstrap linking from prior 8B slice remains in `link-legacy.ts`.

## Consequences

**Positive**

- Explicit permission vocabulary for cross-tenant RBAC and audit actor enrichment
- Tenant isolation enforced in authorization layer
- Agent scopes ready without synthetic user emails

**Negative**

- Two systems until cutover — developers must not assume platform RBAC replaces cookies
- Admin shared-code sessions use `legacy_admin` synthetic grant only on probe routes

## Rollback

Set `PLATFORM_IDENTITY_ENABLED=false`. Remove `lib/platform/authorization/` and probe route dual checks. Legacy auth unchanged.

## Future (Phase 8C)

- Map `authorizeAdminRequest` sessions to PlatformUser (product decision)
- Enforce permissions on publishing routes behind flag
- Accountant flag → platform permission bridge table
- Audit `actorId` from resolved PlatformUser
