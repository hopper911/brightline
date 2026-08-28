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

### Dual reference migration strategy (Phase 4C)

First domain model: **`PortfolioImage`** — optional nullable `assetId` → `platform_assets`.

| Principle | Implementation |
| --- | --- |
| Legacy retained | `url`, `storageKey`, `fullUrl` unchanged and still written |
| Optional FK | `assetId String?` — never required |
| Registry backfill | Phase 4B `--source=brightline-portfolio` registers storage objects |
| Domain link backfill | `--link-domain` sets `assetId` via `findByStorageRef` when confident |
| Read path | `resolveDomainMedia()` — asset-first only when `PLATFORM_ASSET_READ_ENABLED` |
| Default reads | Flag **off** → legacy refs only (production unchanged) |
| Conflict | Asset object ≠ legacy object → log warning, **use legacy** |
| Dual-write | Admin portfolio save sets `assetId` when registry row already exists for `storageKey` |
| No removal | Do not drop legacy columns until a much later phase |

Future phases:

1. Additional domain models (`mirotech-cms`, galleries)
2. Wire `resolveDomainMedia` into public delivery behind `PLATFORM_ASSET_READ_ENABLED`
3. Never auto-link entire tables without dry-run approval

### Asset read cutover (Phase 4D)

First read surface: **admin `GET /api/admin/portfolio`** — enriches image delivery `url` when `PLATFORM_ASSET_READ_ENABLED` is on.

| Principle | Implementation |
| --- | --- |
| Coverage gate | `npm run assets:coverage` before enabling flag |
| Resolution | `resolveDomainMedia` → `MediaService.getAssetUrl` |
| Fallback | Mandatory legacy path on missing asset, tenant mismatch, conflict |
| Tenant | Brightline domain rows reject Mirotech assets |
| Batch reads | `findPlatformAssetsByIds` preload — no N+1 registry lookups |
| Flag default | **off** — production enable is manual |
| Observability | `[platform-asset-read]` log counters |

See `docs/architecture/asset-read-cutover-runbook.md`.

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

1. Set `PLATFORM_ASSET_REGISTRY_ENABLED=false` and `PLATFORM_ASSET_READ_ENABLED=false`
2. Null `PortfolioImage.assetId` or drop FK column if needed — legacy URLs/keys unchanged
3. Drop `platform_assets` table (migration reverse) if needed — optional FK only
4. Remove registry calls from MediaService — storage paths unchanged

## References

- `lib/platform/assets/`
- `lib/platform/media/media-service.ts`
- Migration `20260828160000_platform_asset_registry`
