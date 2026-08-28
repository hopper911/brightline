# ADR-001: Platform Foundation (Phase 1A)

**Status:** Accepted  
**Date:** 2026-08-28  
**Scope:** Brightline repository — architecture modernization Phase 1A only

## Context

Brightline Photography and MiroTech Solutions are **independent Next.js applications** sharing Neon Postgres (Brightline side), Cloudflare R2 (two vaults), Studio Hub publishing, and admin handoff tokens. Coupling is implemented through direct HTTP clients, shared secrets, and dual-bucket R2 management from Brightline admin — not through a neutral platform layer.

Production must remain available throughout migration. The program uses a **strangler fig** pattern: introduce abstractions beside legacy code, migrate consumers gradually, deprecate only after parity.

## Decision

Introduce a minimal **`lib/platform/`** module and an additive **`platform_tenants`** database table without changing runtime behavior.

### Modular platform in a monolith

Platform concepts live in `lib/platform/` inside the existing Brightline repo rather than as new deployables. This matches Vercel Hobby constraints and avoids premature microservices.

### Apps remain independent

We will **not** combine Brightline and MiroTech into one Next.js application. Tenant registry acknowledges both brands; each keeps its own deploy and public origin.

### Incremental migration

Phase 1A delivers:

- Typed **`TenantSlug`** (`brightline` | `mirotech`) and central **`TENANT_REGISTRY`**
- **`PlatformFeatures`** env flags (all default `false`)
- **Interface types only** for future Media / Content / Publishing services
- Additive **`PlatformTenant`** Prisma model + migration SQL with idempotent seed rows

No existing routes, auth, R2 paths, or publish flows are rewired in this phase.

### Tenant model

| Field | Purpose |
| --- | --- |
| `slug` | Stable identifier (`brightline`, `mirotech`) |
| `name` | Display name |

Registry in code is the source of truth for origins and labels; DB rows support future FKs and audit. Legacy helpers map vault IDs and site strings → `TenantSlug` without scattering string comparisons.

### Compatibility strategy

- Missing `PLATFORM_*_ENABLED` env vars → legacy behavior
- New table has **no required FKs** on existing models
- Migration SQL uses `ON CONFLICT DO UPDATE` for tenant names only
- Prisma seed upserts tenants idempotently

## Consequences

**Positive**

- Single import path for tenant identity (`@/lib/platform`)
- Feature flags ready for strangler routing in Phase 1B+
- Service interfaces document intended boundaries without speculative implementations
- Database ready for platform-domain FKs in later phases

**Negative / tradeoffs**

- Temporary duplication: code registry + DB table until consumers read from DB
- Developers must distinguish CMS feature flags (`lib/feature-flags.ts`) from platform flags (`lib/platform/features.ts`)

## Rollback strategy

1. **Application:** Delete `lib/platform/` — nothing imports it yet in Phase 1A.
2. **Database:** Table is standalone; rollback migration can `DROP TABLE platform_tenants` when no dependents exist (later phases may add FKs — rollback then requires phase-specific plan).
3. **Env:** Unset any `PLATFORM_*_ENABLED` variables (defaults already false).

## References

- Phase 0 inventory: [`current-state.md`](./current-state.md)
- Frozen truth: `lib/truth/site-state.ts`
