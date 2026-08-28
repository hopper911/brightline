# ADR-012: Studio Operational Shell (Phase 9A)

**Status:** Accepted  
**Date:** 2026-08-28  
**Depends on:** [ADR-011](./ADR-011-parallel-sso.md), [ADR-010 RBAC](./ADR-010-rbac.md)

## Context

Brightline admin, Studio OS (`/studio`), and Mirotech admin (via handoff/SSO) grew as separate surfaces. Phase 9A introduces a **control-plane shell** that organizes operational entry points without migrating business logic.

## Decision

### Studio ops shell (`/studio/ops`)

- Navigation sections: **Overview, Brightline, MiroTech, Content, Media, Publishing, System**
- **Link-only** — routes to existing `/admin`, `/studio`, and API probes
- Uses existing `admin_access` cookie — **no separate Studio credentials**
- Tenant switcher driven by **PlatformMembership** when identity is enabled; legacy admin sees both tenants synthetically

### Not in scope (9A)

- Replacing admin workflows
- Duplicating CMS, media, or publishing UIs
- Public-site changes

### Phase 8D-A bridge (shipped with 9A)

- `ensureAdminPlatformUser()` links shared admin to PlatformUser via `admin_access` / `shared`
- SSO start bootstraps staff user from legacy admin when `ADMIN_EMAIL` is set
- `LEGACY_ADMIN_HANDOFF_ENABLED` (default `true`) gates ho1 minting

## Consequences

**Positive:** Single operational map; permission-aware sections; foundation for 9B observability.

**Negative:** Dual nav (legacy AdminNav + ops sub-nav) until a future consolidation phase.

## Rollback

Remove `/studio/ops` routes and nav item. No database changes required.
