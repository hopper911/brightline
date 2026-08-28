# ADR-002: Tenant Context (Phase 1B)

**Status:** Accepted  
**Date:** 2026-08-28  
**Depends on:** [ADR-001](./ADR-001-platform-foundation.md)

## Context

Brightline Photography and MiroTech Solutions are independent public applications that share infrastructure (Neon, R2, Studio Hub, handoff tokens). Future platform services — media, content, publishing, permissions, jobs, audit — need a reliable **tenant boundary** without merging the apps or rewriting production paths in one step.

Today, brand/site identity is inferred from hard-coded domains, env vars, CMS `primarySite` fields, and R2 vault ids scattered across the codebase.

## Decision

Introduce a centralized, typed tenant layer in `lib/platform/`:

| Piece | Role |
| --- | --- |
| `TenantSlug` | `'brightline' \| 'mirotech'` |
| `TenantConfig` | Static metadata: `displayName`, `primaryDomain`, `publicOrigin` |
| `resolveTenantBySlug()` | Canonical resolution (throws on unknown) |
| `resolveTenantByHostname()` | Convenience adapter (returns `null` on unknown) |
| `PlatformContext` | `{ tenant: TenantConfig }` for future services |
| `resolveTenantFromRequest()` | Server-only Host header helper |
| `PlatformTenant` (Prisma) | Persistent identity for future FKs |

No existing route, query, auth, R2, or publish path is wired to this layer in Phase 1B.

## Static vs database tenant model

**TenantConfig (static registry)**  
Runtime source of truth for domains, display names, and public origins. Deterministic, no DB round-trip, safe for scripts, tests, and edge handlers.

**PlatformTenant (database row)**  
Persistent identity anchor for future relations (`tenantId` on assets, audit events, jobs). Seeded idempotently; name synced from registry on upsert.

Do not force every lookup through Postgres — use static config unless a FK or audit row requires the DB record.

## Application boundary

Tenant abstraction does **not** combine Brightline and MiroTech into one application. Each keeps its own Vercel deploy and public origin. The Brightline repo hosts platform primitives that **describe** both tenants because it operates shared admin tooling and the Mirotech R2 vault.

## Failure behavior

Unknown tenant slugs throw `TenantResolutionError` (`unknown_tenant`).  
Unknown hostnames return `null` (or throw via `resolveTenantByHostnameOrThrow` when explicitly needed).

**Never** default unknown hosts to Brightline or MiroTech.

## Future use

`PlatformContext` will later be passed into:

- MediaService / ContentService / PublishingService adapters
- Permission checks and audit events
- Background jobs and Studio/AI agent scoping

Phase 1B creates the types and resolvers only.

## Rollback

Remove `lib/platform/context/`, `lib/platform/tenants/resolver.ts`, `lib/platform/tenants/repository.ts`, and related tests. No legacy code imports these modules yet, so runtime behavior is unchanged.

Database rollback: drop `platform_tenants` only when no downstream FKs exist (same as ADR-001).

## References

- [`current-state.md`](./current-state.md) — brand resolution inventory
- Phase 1A: `PlatformTenant` migration `20260828120000_platform_tenant_foundation`
