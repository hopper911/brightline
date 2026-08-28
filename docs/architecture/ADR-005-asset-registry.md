# ADR-005: Platform Asset Registry

**Status:** Accepted  
**Date:** 2026-08-28  
**Depends on:** [ADR-004](./ADR-004-media-service.md), [ADR-001](./ADR-001-platform-foundation.md)

## Context

Brightline and Mirotech store media references across many domain models (`GalleryImage.storageKey`, `MediaAsset.keyFull`, CMS JSON URLs, etc.). Storage identity today is effectively **provider + bucket + objectKey** (via R2 vault credentials).

Phase 3 established `MediaService` / `R2MediaProvider` without requiring asset IDs. Domain tables must continue working without migration.

## Decision

Introduce an additive **`PlatformAsset`** registry (`platform_assets`) as the stable platform identity for media objects.

```
Domain record (future) ──► PlatformAsset.id
                              │
                              ├── tenantId → platform_tenants
                              ├── provider (R2)
                              ├── vault + bucket + objectKey
                              └── visibility (PUBLIC | PRIVATE)
```

### Asset identity vs storage identity

| Layer | Identity | Persisted in domain tables (today) |
| --- | --- | --- |
| **Storage** | vault + objectKey (+ resolved bucket) | Yes — legacy authoritative |
| **Platform** | `PlatformAsset.id` | No — optional future FK |

Delivery and existing CMS/gallery records **continue to use storage keys** until controlled backfill (Phase 4B+).

### Existing models reviewed

| Model | Role | Registry? |
| --- | --- | --- |
| `MediaAsset` | Work/Studio project media join | Domain-specific — not generalized |
| `GalleryImage` | Client gallery rows + selection metadata | Domain-specific |
| `StudioMedia` | Studio OS CMS | Domain-specific |
| `PortfolioImage` | Legacy portfolio | Domain-specific |

**No suitable general registry existed.** `PlatformAsset` is new and does not replace domain models.

### Schema (Phase 4A minimum)

- `id`, `tenantId`, `provider` (R2), `vault`, `bucket`, `objectKey`
- Optional: `filename`, `mimeType`, `metadata` (JSON)
- `visibility`: `PUBLIC` | `PRIVATE`
- `@@unique([provider, bucket, objectKey])` — one registry row per physical object

`vault` is stored for `MediaObjectRef` resolution without inferring from bucket names.

### Tenant ownership

Every asset row FKs `platform_tenants`. Registration uses `PlatformContext.tenant`.

### Provider abstraction

Only **R2** is implemented. Enum allows future providers without pretending they exist today.

### Legacy compatibility

`MediaService` accepts transitional **`MediaReference`**:

- Direct `MediaObjectRef` (legacy)
- `{ assetId }` (platform)
- `PlatformMediaAssetRef` (Phase 3A compat)

`resolveToObjectRef()` resolves either form. Existing operations unchanged when registry flag is off.

### New asset registration

- Flag: **`PLATFORM_ASSET_REGISTRY_ENABLED`** (default **off**)
- API: `MediaService.registerAsset()` → `PlatformAssetRegistryService.register()`
- **Not wired to upload routes in 4A** — explicit opt-in by future callers after successful storage write
- **Consistency policy:** registry failures are **non-blocking** by default (`strict: false`). Upload/delivery success must not depend on registry writes unless caller opts into `strict: true`.
- Audit: `asset.registered` on **create** only (via `recordAuditSafely`)

### Backfill strategy

**Phase 4A: zero backfill.** No R2 scan, no gallery/project/journal updates.

**Phase 4B: controlled database-driven backfill** (see `docs/architecture/asset-backfill-runbook.md`):

1. **Database-first** — domain tables (`PortfolioImage`, etc.) are the source of truth for *meaningful* objects; R2 bucket scans are avoided because buckets contain orphans, tmp uploads, and abandoned files.
2. **One source per run** — initial source: `brightline-portfolio` (published legacy portfolio keys, Brightline tenant, PUBLIC when prefix policy allows).
3. **Dry-run required first** — `--dry-run` / `DRY_RUN=1` reports counts without writes.
4. **Idempotency** — `findPlatformAssetByStorageRef` + `upsertPlatformAssetFromStorageRef`; duplicate physical objects never create duplicate rows.
5. **No domain mutation** — backfill populates `platform_assets` only; gallery/project/journal rows keep legacy storage keys.
6. **Optional storage verify** — `--verify-storage` HEADs R2 per candidate; missing objects are skipped, not fatal.
7. **Private/public safety** — non-public prefixes on published rows register as `PRIVATE` with ambiguity flagged; never default private media to PUBLIC.
8. **CLI only** — `npm run assets:backfill`; no public API. Production runs require explicit human approval after dry-run review.
9. **Audit summary** — single `asset.backfill.completed` event when audit flag is on (not per-row noise).
10. **Rollback** — delete erroneous `platform_assets` rows or truncate table; domain and R2 unchanged.

Future phases:

1. Additional sources (`mirotech-cms-projects`, galleries, etc.)
2. Optional dual-read (asset id + storage key) on migrated domain columns
3. Never auto-register entire buckets in production without explicit approval

### Failure consistency

| Scenario | Behavior |
| --- | --- |
| Flag off | Skip registration; no DB writes |
| Flag on, DB error, `strict: false` | Log + return `{ skipped: true, reason: "failed" }`; media op continues |
| Flag on, DB error, `strict: true` | Return `{ ok: false, error }` to caller |
| Duplicate physical object | Upsert updates metadata; no duplicate rows |

## Consequences

**Positive:** Stable IDs for future migrations, audit, dedup, lifecycle policy

**Negative:** Temporary dual identity (storage key + asset id) until domain adoption

## Rollback

1. Set `PLATFORM_ASSET_REGISTRY_ENABLED=false`
2. Drop `platform_assets` table (migration reverse) if needed — no legacy FKs
3. Remove registry calls from MediaService — storage paths unchanged

## References

- `lib/platform/assets/`
- `lib/platform/media/media-service.ts`
- Migration `20260828160000_platform_asset_registry`
