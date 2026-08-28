# DATABASE RETIREMENT REPORT — PHASE 11D

**Date:** 2026-08-28  
**Branch:** `architecture/platform-foundation`  
**Scope:** Analysis only — **no DROP COLUMN, no DROP TABLE, no destructive migration**

---

## Executive summary

Transitional database fields fall into three buckets:

1. **Active authoritative** — still read/written by production paths (portfolio URL keys, blog Mirotech JSON, client gallery media, Work hero fields).
2. **Platform migration in progress** — `PortfolioImage.assetId` / `PlatformAsset` registry (0% linked in production today).
3. **Schema scaffold / unwired** — Lead↔StudioLead bridge columns, `StudioMedia` table, `heroStudioMediaId` (zero application reads/writes; empty or unset in production).

**No field group is ready for column drop in this phase.** Closest candidates (`Lead.studioLeadId`, `StudioLead.legacyLeadId`, `PortfolioImage.thumbUrl`/`fullUrl`) need a non-destructive prod verification pass before any future migration PR.

---

## Production data snapshot (2026-08-28)

Source: `npm run assets:coverage:prod` + read-only Prisma counts against production Neon (host only logged by CLI; no credentials in this doc).

### PortfolioImage → PlatformAsset coverage

| Metric | Value |
| --- | --- |
| Total `PortfolioImage` rows | **3** |
| With `assetId` | **0 (0%)** |
| Without `assetId` (legacy-only) | **3** |
| Published total | **0** |
| Published with `assetId` | **0** |
| Key/object conflicts | **0** |
| Invalid `assetId` references | **0** |
| Missing legacy reference | **0** |

**Conclusion:** Asset migration coverage is **not complete**. Legacy `url` / `storageKey` remain authoritative. Do not retire legacy portfolio URL columns until backfill + `PLATFORM_ASSET_READ_ENABLED` cutover with published-row parity.

### Other production row counts

| Entity / field | Count | Notes |
| --- | ---: | --- |
| `PlatformAsset` | 0 | Registry empty |
| `PlatformLegacyIdentityLink` | 0 | Bridge table unused in DB (identity flag may still gate runtime) |
| `PlatformSsoExchangeNonce` | 0 | No consumed nonces retained |
| `StudioMedia` | 0 | Model scaffold only |
| `Lead` | 0 | Legacy lead table empty |
| `StudioLead` | 1 | Active Studio lead path |
| `Lead.studioLeadId` populated | 0 | Bridge never wired |
| `StudioLead.legacyLeadId` populated | 0 | Bridge never wired |
| `PortfolioImage.fullUrl` / `thumbUrl` / `isHero=true` | 0 each | Columns unused in prod data |
| `StudioProject.heroStudioMediaId` set | 0 | Column unused in prod |
| `PlatformAuditEvent` | 0 | Audit flag off in prod |
| `PlatformJob` | 0 | Jobs flag off in prod |

---

## Field-by-field analysis

### 1. PortfolioImage legacy URLs + `assetId`

**Schema:** `PortfolioImage` — `url`, `thumbUrl`, `fullUrl`, `storageKey`, `assetId`, `isHero`

| Field | Reads | Writes | Dual-write? | Recommendation |
| --- | --- | --- | --- | --- |
| `url` | `portfolio-image-delivery.ts`, `resolve-domain-media.ts`, admin portfolio UI | `app/api/admin/portfolio/route.ts` POST/PATCH (derived from `storageKey`) | Always with `storageKey` | **KEEP** |
| `storageKey` | Same + R2 admin (`admin-r2-manager.ts`), asset-health | POST/PATCH portfolio; R2 move/rename | Always | **KEEP** |
| `assetId` | `resolve-domain-media.ts`, Studio `/studio/media`, coverage | PATCH + POST create when registry match (`lookupPlatformAssetIdsForBrightlineKeys`); backfill `--link-domain` | **Partial** — legacy always; `assetId` opportunistic | **KEEP** — expand after backfill |
| `fullUrl` / `thumbUrl` | Backfill query resolution only | **No app route writes** | Stopped | **STOP WRITING FIRST** (done) → **READY FOR FUTURE DROP** after prod column audit |
| `isHero` | Type only | **No app writes found** | N/A | **UNKNOWN** → likely **READY FOR FUTURE DROP** if prod stays zero |

**Scripts:** `npm run assets:backfill`, `assets:coverage`, `lib/platform/assets/backfill/run-backfill.ts`  
**Flag:** `PLATFORM_ASSET_READ_ENABLED` — off → legacy read path only.

---

### 2. PlatformAsset registry

**Schema:** `platform_assets` (`PlatformAsset`)

| Aspect | Detail |
| --- | --- |
| Reads | `repository.ts`, `registry-service.ts`, `resolve-domain-media.ts`, Studio media list |
| Writes | Backfill (`run-backfill.ts`), `registry-service.register()` (gated `PLATFORM_ASSET_REGISTRY_ENABLED`) |
| Upload dual-write | **Not wired** — no production upload route calls `MediaService.registerAsset()` |
| Recommendation | **KEEP** — retirement target is legacy columns on domain models, not this table |

---

### 3. PlatformLegacyIdentityLink

**Schema:** `legacyKind`, `legacyRefId` → `PlatformUser`

| Aspect | Detail |
| --- | --- |
| Reads | `lib/platform/identity/repository.ts` (`findPlatformUserByLegacyLink`) |
| Writes | `link-legacy.ts` on admin/accountant bootstrap (`PLATFORM_IDENTITY_ENABLED`) |
| Prod data | 0 rows |
| Recommendation | **KEEP** — required while legacy session auth coexists with PlatformUser bridge |

---

### 4. PlatformSsoExchangeNonce

**Schema:** ephemeral SSO replay guard

| Aspect | Detail |
| --- | --- |
| Writes | `nonce-store.ts` on SSO redeem |
| Reads | Insert-only / consume pattern |
| Prod data | 0 rows |
| Recommendation | **KEEP** while SSO active; add TTL cleanup before considering table retirement |

---

### 5. Lead ↔ StudioLead bridge

**Schema:** `Lead.studioLeadId`, `StudioLead.legacyLeadId`

| Aspect | Detail |
| --- | --- |
| App reads | **None** in `.ts`/`.tsx` |
| App writes | **None** |
| Active systems | Legacy `Lead` API (`/api/admin/leads/*`) vs `StudioLead` (`/api/admin/studio-leads/*`) — parallel, not bridged |
| Prod data | 0 leads; bridge columns never populated |
| Recommendation | **READY FOR FUTURE DROP** (both columns + relation) after confirming no manual SQL/seed deps and legacy Lead API retired |

---

### 6. StudioMedia (`r2KeyFull`, `r2KeyThumb`, `urlFull`, `urlThumb`)

**Schema:** `StudioMedia`

| Aspect | Detail |
| --- | --- |
| Reads | R2 hygiene refs (`admin-r2-brightline-media-refs.ts`, `asset-health`); admin dashboard count |
| Writes | **`prisma/seed.js` only** — no production ingest route |
| Prod data | 0 rows |
| Note | Admin media upsert writes `GalleryImage` + `MediaAsset`, not `StudioMedia` |
| Recommendation | **KEEP** table until Studio OS media ingest ships; `urlFull`/`urlThumb` → **READY FOR FUTURE DROP** once keys are canonical |

---

### 7. StudioProject legacy CMS vs Studio OS linkage

**Schema:** `client` (string), `clientId` (FK), `heroImageId`, `heroStudioMediaId`, `gallery` JSON, `galleryCarouselEnabled`, `galleryBlocks`

| Field | Reads | Writes | Recommendation |
| --- | --- | --- | --- |
| `client` (string) | Studio CMS, finance, public case study | Create/update everywhere | **KEEP** (canonical display today) |
| `clientId` | Lead convert, `client-access.ts` | Lead convert + seed only | **STOP WRITING FIRST** — wire through CMS create/update |
| `heroImageId` → `MediaAsset` | Studio CMS admin/public | CMS flows | **KEEP** |
| `heroStudioMediaId` | Seed only | Seed only | **READY FOR FUTURE DROP** |
| `galleryCarouselEnabled` | Work + Studio UI when `galleryBlocks` empty | Admin PATCH | **STOP WRITING FIRST** after universal `galleryBlocks` |
| `galleryBlocks` | Public/admin case studies, Mirotech ingest | Admin editors | **KEEP** |

---

### 8. PlatformAuditEvent / PlatformJob denormalization

**Schema:** `tenantId` + `tenantSlug` on both tables

| Aspect | Detail |
| --- | --- |
| Writes | Both fields set intentionally (`audit-service.ts`, job insert) |
| Reads | Studio activity, publishing dashboard, cron drain |
| Recommendation | **KEEP** both — denormalization by design; do not drop `tenantSlug` first |

---

### 9. Blog Mirotech fields (SiteSetting JSON)

**Storage:** `SiteSetting` key `blog_posts:v1` — not Prisma columns

| Field | Reads | Writes | Recommendation |
| --- | --- | --- | --- |
| `publishToMirotech` | Admin blog, sync eligibility | `saveBlogPosts` via blog PATCH | **KEEP** |
| `mirotechJournalId` | Sync + admin UI | Updated after successful sync | **KEEP** — remote id pointer |

**Scripts:** `scripts/resync-mirotech-journal.ts`  
**Serialization:** `lib/blog-post-model.ts`, journal ingest payload

---

### 10. Work / Gallery / Client delivery media

| Model / field | Role | Recommendation |
| --- | --- | --- |
| `WorkProject.heroMediaId` + `MediaAsset.keyFull/keyThumb` | Public Work pages | **KEEP** |
| `GalleryImage.storageKey`, `thumbUrl`, `fullUrl`, `isHero` | Client gallery delivery | **KEEP** — authoritative |
| `DeliveryPackageItem.storageKey` | Package downloads | **KEEP** |
| `PortfolioProject.coverUrl` / `coverStorageKey` | Admin portfolio + backfill | **KEEP** until asset registry covers covers |

---

### 11. Other transitional items

| Item | Recommendation |
| --- | --- |
| `Lead` table (whole) | **STOP WRITING FIRST** on legacy API → migrate UI → future table drop |
| `WorkCaseStudy` | **UNKNOWN** — dashboard count only; verify prod rows before drop |
| `ProjectImage.url` (client portal) | **KEEP** until portal migrated |
| Runtime `legacyObjectKey` conflict type (`resolve-domain-media.ts`) | **KEEP** — not a DB column |
| `MediaAsset` vs `PlatformAsset` parallel registries | **KEEP both** during strangler |

---

## Write observation summary

| Pattern | Status |
| --- | --- |
| Portfolio admin always writes `url` + `storageKey` | **Active dual-write (legacy authoritative)** |
| Portfolio POST/PATCH sets `assetId` when registry match exists | **Partial dual-write** — registry empty in prod |
| Upload routes do not register `PlatformAsset` on ingest | **Gap** — intentional until media flag cutover |
| Blog PATCH updates `mirotechJournalId` after sync | **Active** — required |
| Identity link created on admin login bootstrap | **Active when `PLATFORM_IDENTITY_ENABLED`** |
| Lead↔StudioLead bridge | **Never written** |
| `thumbUrl` / `fullUrl` on portfolio | **Not written by app** |

**Rule applied:** Fields with intentional dual-write or partial migration are **not ready** for drop.

---

## Recommended retirement sequence (future phases — no schema in 11D)

| Phase | Action | Preconditions |
| --- | --- | --- |
| **11E** | Drop unwired bridge columns: `Lead.studioLeadId`, `StudioLead.legacyLeadId` | Legacy Lead API retired; prod confirms 0 dependencies |
| **11F** | Drop unused portfolio columns: `thumbUrl`, `fullUrl`, `isHero` | Prod audit + app grep clean |
| **11G** | Run `assets:backfill:prod` + re-run coverage until published parity | `linkedPercent` near 100%, zero conflicts |
| **11H** | Enable `PLATFORM_ASSET_READ_ENABLED` staging burn-in | Per `asset-read-cutover-runbook.md` |
| **11I** | Stop reading legacy portfolio URL columns | After read flag stable ≥2 weeks |
| **11J** | Drop legacy portfolio URL columns | After stop-read + rollback window |
| **Later** | Normalize `StudioProject.client` → `clientId` FK | Wire CMS create/update first |
| **Later** | Retire `Lead` table | StudioLead migration complete |
| **Later** | Retire handoff + identity link table | SSO-only staff auth proven |

---

## Tooling reference

| Command | Purpose |
| --- | --- |
| `npm run assets:coverage` / `assets:coverage:prod` | PortfolioImage `assetId` linkage report |
| `npm run assets:backfill` / `assets:backfill:prod` | Register + link platform assets |
| `lib/asset-health/` | Bucket + registry ref scan (admin R2) |

Runbooks: `docs/architecture/asset-backfill-runbook.md`, `asset-read-cutover-runbook.md`

---

## Validation (this phase)

- No `prisma/migrations` changes
- No schema edits
- Production queries read-only
- Report committed to `docs/architecture/`

---

## Runtime behavior change

**NONE** — analysis and documentation only.
