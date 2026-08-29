# PHASE 12B — Data Integrity Hardening Report

**Date:** 2026-08-28  
**Branch:** `architecture/platform-foundation` (post–Phase 12A `434d83b`)  
**Scope:** Platform Prisma models — tenant registry, assets, audit, identity, jobs, and publishing job payloads.

**Migration policy:** No schema changes in this phase. Existing additive migrations (Phases 1A–8C) already carry the justified constraints and indexes. Further changes require explicit human approval.

---

## 1. Constraints

### PlatformTenant (`platform_tenants`)

| Constraint | Status | Notes |
| --- | --- | --- |
| `slug` UNIQUE | ✅ Present | Canonical tenant identifier (`brightline`, `mirotech`); seeded idempotently |
| `id` PK | ✅ | Stable CUID |

Tenants are **registry rows**, not created/deleted at runtime. Slug uniqueness prevents duplicate tenant namespaces.

### PlatformAsset (`platform_assets`)

| Constraint | Status | Notes |
| --- | --- | --- |
| `(provider, bucket, objectKey)` UNIQUE | ✅ Present | Global physical storage identity — one registry row per R2 object |
| `tenantId` NOT NULL + FK | ✅ | Every asset belongs to exactly one tenant |

**Design note:** Uniqueness is on **physical storage**, not `(tenantId, objectKey)`. Brightline and Mirotech use separate buckets/vaults in practice, so cross-tenant key collision is not expected. `upsertPlatformAssetFromStorageRef` resolves by storage ref, not tenant.

### PlatformMembership (`platform_memberships`)

| Constraint | Status | Notes |
| --- | --- | --- |
| `(userId, tenantId)` UNIQUE | ✅ Present | One membership row per user per tenant |
| `role` enum | ✅ | `PlatformMembershipRole` |

### PlatformUser (`platform_users`)

| Constraint | Status | Notes |
| --- | --- |
| `email` UNIQUE | ✅ Present (nullable) | Multiple `NULL` emails allowed under PostgreSQL UNIQUE semantics |
| `status` enum | ✅ | `ACTIVE`, `INVITED`, `DISABLED` |

### PlatformJob (`platform_jobs`)

| Constraint | Status | Notes |
| --- | --- | --- |
| `idempotencyKey` UNIQUE | ✅ Present (nullable) | Publishing enqueue deduplication |
| `status`, `type` | ⚠️ String columns | Values enforced in application (`JobStatus`, job type constants), not DB enum |

### PlatformAuditEvent (`platform_audit_events`)

| Constraint | Status | Notes |
| --- | --- | --- |
| Denormalized `tenantSlug` NOT NULL | ✅ | Audit survives optional `tenantId` nulling |
| No uniqueness on business keys | ✅ Intentional | Append-only event log |

### PlatformLegacyIdentityLink (`platform_legacy_identity_links`)

| Constraint | Status | Notes |
| --- | --- | --- |
| `(legacyKind, legacyRefId)` UNIQUE | ⚠️ Partial gap | PostgreSQL treats `NULL` `legacyRefId` as distinct — multiple rows with same `legacyKind` and `NULL` ref allowed |
| Application mitigation | ✅ | `findPlatformUserByLegacyLink` uses `findFirst` when `legacyRefId` is null |

### PlatformSsoExchangeNonce (`platform_sso_exchange_nonces`)

| Constraint | Status | Notes |
| --- | --- | --- |
| `nonce` UNIQUE | ✅ Present | Replay protection |
| `userId` | ⚠️ No FK | Ephemeral table; avoids cascade coupling to `platform_users` |

### Publishing records

There is **no separate publishing table**. Publishing state lives in:

- `platform_jobs` rows with `type` prefix `publishing.*`
- JSON `payload` / `result` (see `lib/platform/jobs/publishing-payload.ts`)
- `idempotencyKey` for enqueue deduplication

Content itself remains in legacy domain tables (`WorkProject`, `BlogPost`, Mirotech hub CMS, etc.) — outside platform FK scope by design (ADR-001 additive boundary).

### Stable external identifiers (summary)

| Identifier | Enforced |
| --- | --- |
| Tenant slug | DB UNIQUE |
| R2 object `(provider, bucket, objectKey)` | DB UNIQUE |
| User email (when set) | DB UNIQUE |
| Membership (user + tenant) | DB UNIQUE |
| Job idempotency key (when set) | DB UNIQUE |
| SSO nonce | DB UNIQUE |
| Legacy link (kind + ref when ref set) | DB UNIQUE |

---

## 2. Foreign keys

| Child | Parent | ON DELETE | Assessment |
| --- | --- | --- | --- |
| `platform_assets.tenantId` | `platform_tenants` | **RESTRICT** | ✅ Cannot delete tenant while assets exist |
| `platform_audit_events.tenantId` | `platform_tenants` | **SET NULL** | ✅ Audit history preserved; `tenantSlug` retained |
| `platform_jobs.tenantId` | `platform_tenants` | **SET NULL** | ✅ Job history preserved; `tenantSlug` retained |
| `platform_memberships.userId` | `platform_users` | **CASCADE** | Membership rows removed with user |
| `platform_memberships.tenantId` | `platform_tenants` | **CASCADE** | Membership rows removed if tenant deleted |
| `platform_legacy_identity_links.userId` | `platform_users` | **CASCADE** | Bridge rows removed with user |
| `PortfolioImage.assetId` | `platform_assets` | **SET NULL** | ✅ Legacy portfolio link cleared, image row kept |

**No FK** from platform tables to legacy CMS tables — intentional additive isolation.

**No FK** `platform_sso_exchange_nonces.userId` → `platform_users` — acceptable for short-lived nonce rows.

**No blind cascading deletes** on assets, audit, or jobs. Destructive paths are limited to user-owned bridge/membership rows.

---

## 3. Delete semantics

There are **no application-level delete helpers** for platform tenants, assets, users, or jobs (`grep` finds no `platformAsset.delete` / `platformUser.delete` / `platformTenant.delete`). Behavior is defined by FK policy and operational practice.

### PlatformUser deleted

| Effect | Behavior |
| --- | --- |
| `platform_memberships` | **CASCADE** — memberships removed |
| `platform_legacy_identity_links` | **CASCADE** — SSO/legacy bridge removed |
| `platform_sso_exchange_nonces` | **Orphan** — rows remain (no FK) |
| Audit events referencing `actorId` | **Retained** — no FK on actor |
| Jobs / assets | **Unaffected** |

**Preferred ops path:** set `status = DISABLED` rather than hard delete unless GDPR/offboarding requires removal.

### PlatformTenant deleted

| Effect | Behavior |
| --- | --- |
| `platform_assets` | **RESTRICT** — delete blocked if any asset rows exist |
| `platform_memberships` | **CASCADE** — memberships removed |
| `platform_audit_events.tenantId` | **SET NULL** — events kept with `tenantSlug` |
| `platform_jobs.tenantId` | **SET NULL** — jobs kept with `tenantSlug` |

**Operational reality:** Brightline/Mirotech tenant rows are **seeded and static**. Tenant deletion should not occur in production.

### PlatformAsset deleted

| Effect | Behavior |
| --- | --- |
| `PortfolioImage.assetId` | **SET NULL** — portfolio row survives; link dropped |
| R2 object | **Not deleted** — registry row only; object lifecycle is separate (R2 tools / ops) |

**Preferred ops path:** do not delete registry rows for live objects; update metadata or visibility instead.

### Content archived (legacy domain)

Platform tables do not model archive state. Archiving a blog post, work project, or hub case study:

- Updates legacy CMS / Prisma domain rows
- Does **not** cascade to `platform_assets` or `platform_jobs`
- Publishing jobs may complete with stale payload snapshots in job JSON (historical record)

Audit events for publish/archive actions remain in `platform_audit_events`.

### Publishing job lifecycle

Jobs transition `PENDING` → `RUNNING` → `COMPLETED` / `FAILED` in place. No delete-on-complete. Failed jobs may be retried up to `MAX_PUBLISHING_JOB_ATTEMPTS` (application).

---

## 4. Indexes

### Current indexes (platform models)

| Table | Index | Serves |
| --- | --- | --- |
| `platform_tenants` | `slug` UNIQUE | Tenant resolution |
| `platform_assets` | `(provider, bucket, objectKey)` UNIQUE | Storage ref lookup (`findPlatformAssetByStorageRef`, batch objectKey queries) |
| `platform_assets` | `(tenantId, createdAt)` | Studio/admin tenant asset listing |
| `platform_audit_events` | `(tenantSlug, createdAt)` | Studio activity by tenant |
| `platform_audit_events` | `(action, createdAt)` | Metrics / filtered audit |
| `platform_audit_events` | `(resourceType, resourceId)` | Resource-scoped audit lookup |
| `platform_audit_events` | `(createdAt)` | Time-range scans |
| `platform_jobs` | `(tenantSlug, status, createdAt)` | Publishing dashboard per tenant |
| `platform_jobs` | `(type, status)` | Type/status aggregation |
| `platform_jobs` | `idempotencyKey` UNIQUE | Idempotent enqueue |
| `platform_memberships` | `(userId, tenantId)` UNIQUE | Membership resolution |
| `platform_memberships` | `(tenantId, role)` | Tenant role listing |
| `platform_legacy_identity_links` | `(legacyKind, legacyRefId)` UNIQUE | Legacy bridge lookup |
| `platform_legacy_identity_links` | `(userId)` | User → links |
| `platform_sso_exchange_nonces` | `nonce` UNIQUE | Redeem |
| `platform_sso_exchange_nonces` | `(expiresAt)` | TTL cleanup |
| `platform_sso_exchange_nonces` | `(audience, consumedAt)` | Audience-scoped queries |
| `PortfolioImage` | `(assetId)` | Optional platform asset link |

### Query paths reviewed

| Path | Index coverage |
| --- | --- |
| `findPlatformJobById` | PK |
| `findPlatformJobByIdempotencyKey` | UNIQUE |
| `listRunnablePlatformJobs` (global drain: `status IN (PENDING, FAILED)` ORDER `createdAt`) | ⚠️ No dedicated `(status, createdAt)` index — acceptable at current job volume |
| `listPlatformPublishingJobs` (tenant + `type startsWith publishing.`) | `(tenantSlug, status, createdAt)` helps tenant/status; `type` filter is application-level |
| `listPlatformAssetsByTenantSlug` | `(tenantId, createdAt)` via tenant FK join on slug |
| `findPlatformAssetsByObjectKeys` | UNIQUE storage ref |
| `listPlatformAuditEvents` | `(tenantSlug, createdAt)` |
| Identity lookups | PK / UNIQUE on email, membership composite |

### Index recommendations (deferred — not applied)

| Proposal | Rationale | Why deferred |
| --- | --- | --- |
| `platform_jobs (status, createdAt)` partial index for runnable jobs | Would speed global job drain | Low job volume today; additive migration still needs approval |
| `platform_jobs (tenantSlug, type, createdAt)` | Publishing list with type prefix | Existing tenant+status index sufficient for current scale |
| Partial UNIQUE on `legacyKind` WHERE `legacyRefId IS NULL` | Close NULL duplicate gap | Requires migration + audit of existing rows |

**No excessive indexing added** in this phase.

---

## 5. Migrations

### Existing platform migration chain (all additive)

| Migration | Phase | Content |
| --- | --- | --- |
| `20260828120000_platform_tenant_foundation` | 1A | `platform_tenants` + seed |
| `20260828140000_platform_audit_events` | 2A | Audit table + indexes |
| `20260828160000_platform_asset_registry` | 4A | Assets + storage UNIQUE |
| `20260828170000_portfolio_image_platform_asset` | 4C | Optional `PortfolioImage.assetId` FK |
| `20260828180000_platform_jobs` | 7B | Jobs + idempotency |
| `20260828190000_platform_identity` | 8A | Users, memberships, legacy links |
| `20260828200000_platform_sso_exchanges` | 8C | SSO nonces |

All migrations:

- Add tables/columns/indexes only
- Use `IF NOT EXISTS` / idempotent seed where applicable (portfolio FK, tenant seed)
- **No** `DROP`, column removal, or data backfill that alters legacy rows

### Phase 12B migration outcome

**None applied.** Review found existing constraints and indexes aligned with major query paths. No destructive or ambiguous migration proposed.

---

## 6. Remaining integrity risks

| Risk | Severity | Mitigation / follow-up |
| --- | --- | --- |
| **Denormalized `tenantSlug` vs `tenantId`** on jobs/audit | Low | If tenant row removed, `tenantId` nulls but `tenantSlug` remains — consistent for reads; tenants are static |
| **Job `status` / `type` as strings** | Low | Application enums; invalid values could be inserted via raw SQL — consider DB enum only if abuse observed |
| **Legacy identity link NULL `legacyRefId` duplicates** | Low | App uses `findFirst`; partial UNIQUE index if single null-per-kind required |
| **Multiple `NULL` user emails** | Low | Identity linking uses legacy bridge + staff session; email optional at bootstrap |
| **SSO nonce `userId` orphans** | Low | Ephemeral rows; TTL cleanup by `expiresAt` index |
| **No platform FK to legacy content** | By design | Content/asset consistency enforced in application dual-write and backfill runbooks |
| **Portfolio `assetId` adoption** | Ops | Phase 11D: 0% production link rate — integrity bridge unused until backfill |
| **Tenant delete CASCADE on memberships** | Low if tenants static | Dangerous if tenant row ever deleted programmatically — prefer never deleting tenant rows |
| **User delete CASCADE** | Medium for ops | Hard delete removes RBAC; prefer `DISABLED` status |
| **Global job drain index gap** | Low at scale | Add `(status, createdAt)` index when runnable job volume grows |

---

## Summary

Platform data integrity is **sound for current production scale**:

- Critical uniqueness (tenant slug, storage ref, membership composite, job idempotency, SSO nonce) is in place
- Foreign keys use **RESTRICT / SET NULL** for durable records (assets, audit, jobs) and **CASCADE** only for user-owned bridge rows
- Indexes match primary tenant, time, status, resource, and storage lookup paths
- Publishing is job-backed JSON, not a separate table — idempotency keys provide enqueue integrity

**Phase 12B delivered review and documentation only — no schema migration.**
