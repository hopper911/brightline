# Legacy retirement plan (Phase 11A)

**Date:** 2026-08-28  
**Status:** Audit only — **no code, schema, or route removal in Phase 11A**  
**Purpose:** Identify what is safe to retire after platform cutover evidence accumulates.

## Classification key

| Code | Meaning |
| --- | --- |
| **A** | Active / required — production default today |
| **B** | Fallback only — runs when platform flag off or resolver falls back |
| **C** | Apparently unused — no confirmed callers (verify before retirement) |
| **D** | Safe retirement candidate — thin shim or duplicate after cutover |
| **E** | Unknown — needs runtime evidence or dynamic/config wiring |

## Production evidence (Phase 11A)

**Sources available:** local `.env.production.local` snapshot, in-repo observability design, architecture docs. **No production DB or Vercel log query was performed in this phase.**

| Signal | Finding |
| --- | --- |
| Platform flags in local prod env | Only `PLATFORM_IDENTITY_ENABLED=true` observed; other `PLATFORM_*` flags unset → **legacy paths remain default** for media, content, publishing, jobs, audit, asset registry/read |
| `GET /api/admin/platform/metrics` | 24h window over `platform_jobs`, `platform_audit_events` (SSO actions), in-process asset-read counters |
| Asset-read counters | In-process only (`read-observability.ts`) — **reset on cold start**; not durable cross-invocation telemetry |
| Platform job/audit tables | Exercise of platform paths **UNKNOWN** without production query |
| Legacy publish path | **ACTIVE by default** — blog PATCH → `resolveBlogPostsMirotechSync` → legacy branch when `PLATFORM_PUBLISHING_ENABLED=false` |
| Handoff (`ho1`) | **ACTIVE** — `LEGACY_ADMIN_HANDOFF_ENABLED` defaults **on** |

**Rule:** Do not retire any path marked **E** or **B** until flags are on in production ≥2 weeks with zero regressions (per publishing-decoupling.md).

---

## 1. Media

### 1.1 Infrastructure (keep indefinitely)

| Component | Class | Replacement | Evidence | Dependencies | Rollback | Wait | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `lib/storage-r2.ts` | **A** | None — canonical S3Client | All R2 I/O | Entire app | N/A | N/A | **High — must stay** |
| `lib/storage-r2-public.ts` | **A** | Partially wrapped by MediaService | `/api/media/public` | Public delivery | N/A | N/A | **High** |
| `lib/r2.ts`, `lib/media-key-access.ts` | **A** | Used by platform + legacy | URL/key resolution | Public + admin | N/A | N/A | **High** |

### 1.2 Dual-path upload/sign (strangler)

| Component | Class | Replacement | Evidence | Dependencies | Rollback | Wait | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Legacy branch in `app/api/admin/site-media/upload-url` | **B** | MediaService integration | Flag off = legacy | Admin site media | Set `PLATFORM_MEDIA_ENABLED=false` | ≥2 wk after flag on | Medium |
| Legacy branch in `app/api/admin/site-backgrounds/upload-url` | **B** | MediaService | Same | Admin backgrounds | Flag off | ≥2 wk | Medium |
| Legacy branch in `app/api/admin/portfolio/upload-url` | **B** | MediaService | Same | Portfolio admin | Flag off | ≥2 wk | Medium |
| Legacy branch in `app/api/admin/media/sign` | **B** | MediaService | Same | Admin media sign | Flag off | ≥2 wk | Medium |
| Legacy branch in `app/api/admin/r2/upload-url`, `r2/sign` | **B** | MediaService (mirotech vault) | Same | Mirotech R2 admin | Flag off | ≥2 wk | Medium |
| Legacy branch in `lib/gallery-delivery-assets.ts` | **B** | MediaService | Same | Client gallery delivery | Flag off | ≥2 wk | Medium |

### 1.3 Direct R2 without platform branch

| Component | Class | Replacement | Evidence | Dependencies | Rollback | Wait | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `lib/image-strategy.ts` | **A** | MediaService (not wired) | Gallery/work uploads | Admin + client | Keep until routes migrated | After 1.2 cutover | Medium |
| `lib/admin-r2-manager.ts` + `/api/admin/r2/*` | **A** | Asset registry + MediaService (partial) | Primary ops surface | Mirotech reorg, hygiene | Do not remove | ≥6 mo after Studio media parity | **High** |
| `lib/image-port/*`, `lib/admin-r2-compact.ts` | **A** | None planned | Admin ingest pipeline | Image Port UI | N/A | N/A | **High** |
| `lib/integrations/storageProvider.ts` | **A** | MediaService | Studio receipts only | `/api/studio/receipts/*` | N/A | After receipts migrate | Low |
| CLI/scripts (`blupload.mjs`, `upload-watcher.mjs`, etc.) | **A** | Direct R2 (by design) | Local/ops | Sheet pipeline | N/A | N/A | **High** |

### 1.4 Asset registry / read

| Component | Class | Replacement | Evidence | Dependencies | Rollback | Wait | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `resolveDomainMedia` legacy fallback | **B** | Asset-first when `PLATFORM_ASSET_READ_ENABLED` | In-process fallback metrics only | Portfolio delivery | Flag off | ≥2 wk after read cutover | Medium |
| `portfolioImageLegacyReference()` | **A** | `resolveDomainMedia` | Default read path | Public portfolio | N/A | After backfill + read flag | Medium |
| `MediaService.registerAsset()` | **E** | N/A | **No production route callers** | Upload registration gap | N/A | Wire uploads first | Low |
| Admin R2 vault scans vs `/studio/media` registry list | **A** / **B** | Registry when `PLATFORM_ASSET_REGISTRY_ENABLED` | Studio list empty when flag off | Studio 9B | Flag off | After registry backfill | Medium |

---

## 2. Content

| Component | Class | Replacement | Evidence | Dependencies | Rollback | Wait | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `lib/blog-posts.ts` + `SiteSetting` blob | **A** | None for writes | Authoritative CMS | Journal admin | N/A | N/A | **High** |
| `app/api/admin/work-projects/*`, `portfolio/route` | **A** | ContentService read-only mirror | Prisma CRUD default | Admin editors | N/A | N/A | **High** |
| `legacyResolveAdminWorkPreviewContext` | **B** | ContentService | Flag off = Prisma | Work preview page | `PLATFORM_CONTENT_ENABLED=false` | ≥2 wk | Low |
| `lib/dual-brand/content-api.ts` | **A** | MirotechContentAdapter | HTTP read to mirotech.solutions | Studio + admin reads | N/A | After ContentService cutover | Medium |
| `/studio/content/*` empty state | **B** | ContentService | Flag off by default | Studio 9B | Flag off | Enable flag first | Low |
| `@deprecated PlatformContentRef` in `content/types.ts` | **D** | `ContentRef` | Type-only | Tests/docs | Revert import paths | After grep clean | Low |
| `lib/portfolioPillars.ts` deprecated aliases | **E** | `work-pillar-settings` | Unknown dynamic use | Work pages | Grep + runtime | Investigate | Low |

---

## 3. Publishing

| Component | Class | Replacement | Evidence | Dependencies | Rollback | Wait | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `legacySyncBlogPostsMirotech` in `blog-mirotech-sync.ts` | **B** | PublishingService | Default prod path | Blog PATCH | Flag off | ≥2 wk per decoupling doc | Medium |
| `legacyPatch*` in `studio-hub-publish.ts` | **B** | PublishingService | Default prod path | Hub PATCH | Flag off | ≥2 wk | Medium |
| `lib/platform/publishing/mirotech/journal-ingest.ts` | **A** | **Owner** — not legacy | All sync paths delegate here | Blog + scripts | N/A | N/A | **High — must stay** |
| `lib/platform/publishing/mirotech/hub-remote-write.ts` | **A** | **Owner** | Hub HTTP writes | Hub + R2 rewrite | N/A | N/A | **High** |
| `lib/dual-brand/sync-journal.ts` | **~~D~~ REMOVED 11B** | Import `journal-ingest` directly | Was thin re-export shim | `blog-mirotech-sync` legacy branch | Restore from git `06f593a^` | After publishing flag stable | Low |
| `studio-hub.ts` write re-exports | **E** | `hub-remote-write` | Facade; callers vary | Hub admin, R2 rewrite | N/A | Map all callers | Medium |
| `app/api/admin/studio-hub` POST → `createHubProject` | **A** | PublishingService (not migrated) | Explicit remaining legacy | Hub create | N/A | After 6D completion | Medium |
| `lib/admin-r2-mirotech-cms-rewrite.ts` | **A** | PublishingService (intentionally unmigrated) | Ops batch | R2 reorg | N/A | Low priority | Medium |
| `/studio/publishing` + job retry API | **B** | N/A | Empty when flags off | Studio 9C | Flags off | Enable publishing+jobs | Low |

---

## 4. Identity / handoff

| Component | Class | Replacement | Evidence | Dependencies | Rollback | Wait | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Admin session cookie auth | **A** | Parallel SSO | Production login default | All admin | N/A | N/A | **High** |
| `lib/mirotech-admin-handoff.ts` (`ho1`) | **A** | SSO exchange | Handoff default on | Mirotech admin nav | `LEGACY_ADMIN_HANDOFF_ENABLED=true` | After SSO parity ≥4 wk | **High** |
| `app/api/admin/mirotech/handoff` | **A** | `/api/admin/platform/sso/start` | Redirects to SSO when handoff off | Studio ops nav | Handoff flag | ≥4 wk SSO | Medium |
| `ensureAdminPlatformUser` / `link-legacy.ts` | **A** | N/A | Runs when identity flag on | Login bootstrap | Flag off | Keep while bridging | Medium |
| `PlatformLegacyIdentityLink` table | **A** | N/A | Bridge table | IdentityService | N/A | Until all staff on PlatformUser | Medium |
| `PlatformSsoExchangeNonce` | **B** | N/A | SSO only when identity+secret | SSO redeem | Disable SSO | N/A | Low |
| `lib/platform/identity/legacy-resolver.ts` | **A** | N/A | Maps legacy → PlatformUser | RBAC probes | N/A | N/A | Medium |

---

## 5. Direct cross-app dependencies

| Component | Class | Replacement | Evidence | Dependencies | Rollback | Wait | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| HTTP → `mirotech.solutions` Content API | **A** | PublishingService/ContentService adapters | No TS cross-repo imports | Journal + hub | N/A | N/A | **High** |
| `MIROTECH_CONTENT_API_URL` reads | **A** | MirotechContentAdapter | Studio/admin listings | Content flag | N/A | N/A | Medium |
| Bearer auth via handoff secret alias | **A** | Dedicated publish credential | Remote client + handoff | Publish + handoff | N/A | N/A | Medium |
| Cross-deploy SSO (`sso1`/`ps1`) | **B** | N/A | Identity flag on locally | Parallel to handoff | Disable SSO | ≥4 wk | Medium |

**No direct Brightline → MiroTech database access found.** Coupling is HTTP + HMAC tokens only.

---

## 6. Feature flags

| Flag | Default | Prod snapshot (11A) | Both branches compile? | Still necessary? |
| --- | --- | --- | --- | --- |
| `PLATFORM_CONTENT_ENABLED` | off | off (unset) | Yes — dual path in work preview + Studio | Yes — until Studio content cutover |
| `PLATFORM_MEDIA_ENABLED` | off | off | Yes — 6 upload/sign routes + gallery | Yes — until upload strangler complete |
| `PLATFORM_ASSET_REGISTRY_ENABLED` | off | off | Yes — registry no-op when off | Yes — until backfill + Studio media |
| `PLATFORM_ASSET_READ_ENABLED` | off | off | Yes — legacy fallback always | Yes — until portfolio read cutover |
| `PLATFORM_PUBLISHING_ENABLED` | off | off | Yes — integration resolvers | Yes — until publish cutover |
| `PLATFORM_IDENTITY_ENABLED` | off | **on** (local prod env) | Yes — IdentityService gated | Yes — SSO/bootstrap active |
| `PLATFORM_JOBS_ENABLED` | off | off | Yes — sync fallback when off | Yes — until async publish cutover |
| `PLATFORM_AUDIT_ENABLED` | off | off | Yes — audit writes skipped | Yes — until audit write cutover |
| `LEGACY_ADMIN_HANDOFF_ENABLED` | **on** | on (default) | Yes — handoff route → SSO redirect | Yes — until SSO replaces handoff |

**Deprecated API:** `platformFeatures` alias — **REMOVED 11B** (use `getPlatformFeatures()`).

**Deprecated type barrel exports** (`PlatformAssetRef`, `PlatformSignedUrlOptions`, public `PlatformContentRef`) — **REMOVED 11C** (canonical types remain: `PlatformMediaAssetRef`, `ContentRef`).

---

## 7. Legacy DB fields

| Field / pattern | Location | Class | Still needed? | Phase 11D |
| --- | --- | --- | --- | --- |
| `PortfolioImage.url`, `thumbUrl`, `fullUrl`, `storageKey` | `schema.prisma` | **A** | Yes — authoritative when `assetId` null or read flag off | **KEEP** — prod: 3 rows, 0% `assetId` linked |
| `PortfolioImage.assetId` | `schema.prisma` | **B** | Yes — platform link; optional | **KEEP** — expand backfill before stop-read |
| `PortfolioImage.thumbUrl` / `fullUrl` / `isHero` | `schema.prisma` | **C** | No app writes; prod columns empty | **READY FOR FUTURE DROP** (verify first) |
| `legacyObjectKey` (runtime conflict type) | `resolve-domain-media.ts` | **B** | Yes during migration — not a DB column | **KEEP** |
| `PlatformAuditEvent.tenantId` + `tenantSlug` | platform tables | **A** | Yes — denormalized slug for queries | **KEEP** |
| `PlatformJob.tenantId` + `tenantSlug` | platform tables | **A** | Same | **KEEP** |
| `PlatformLegacyIdentityLink` | identity bridge | **A** | Yes while legacy login coexists | **KEEP** — prod 0 rows, runtime gated |
| `PlatformSsoExchangeNonce` | SSO | **B** | Yes when SSO enabled | **KEEP** |
| `Lead.studioLeadId` / `StudioLead.legacyLeadId` | schema | **C** | Never wired in app | **READY FOR FUTURE DROP** |
| `BlogPost.mirotechJournalId`, `publishToMirotech` | SiteSetting JSON | **A** | Yes — publish state | **KEEP** |
| `StudioMedia` + `heroStudioMediaId` | schema | **C/E** | Scaffold — seed only; prod empty | **KEEP** table; **READY FOR FUTURE DROP** on unused columns |
| `StudioProject.client` vs `clientId` | schema | **A/B** | String canonical; FK sparse | **STOP WRITING FIRST** on string after FK wired |
| `imageUrl` (runtime only) | various pages/APIs | **A** | Yes — not a Prisma column | **KEEP** |

**Phase 11D:** Full analysis in `docs/architecture/PHASE-11D-database-retirement-report.md`. **No schema changes.**

**No schema changes in Phase 11A–11D.**

---

## 8. Routes — legacy vs Studio/platform overlap

### Studio (new read/control plane)

| Route | Overlaps | Class |
| --- | --- | --- |
| `/studio/content`, `/studio/media`, `/studio/publishing`, `/studio/activity` | Admin editors + R2 manager | **B** — flag-gated reads |
| `/studio/ops/*` | Link grids to legacy admin | **A** — navigation shell |
| `/studio/ops/content`, `/studio/ops/media` | Redirect to new routes | **A** — compatibility |

### Legacy admin (authoritative editors)

| Route area | Studio overlap | Class |
| --- | --- | --- |
| `/admin/work`, `/admin/blog`, `/admin/portfolio` | `/studio/content` | **A** |
| `/admin/r2`, `/admin/mirotech-media`, `/admin/media` | `/studio/media` | **A** |
| `/admin/studio-cms`, `/admin/studio-hub/*` | `/studio/publishing` | **A** |
| `/admin/mirotech`, handoff API | `/studio/ops/mirotech` | **A** |
| `/api/admin/platform/*` | `/studio/activity`, `/studio/ops/system` | **A** |

**Do not remove any route in Phase 11A.**

---

## 9. Recommended first retirement batch (after cutover evidence)

**Preconditions for any batch:** relevant `PLATFORM_*` flag true in production ≥2 weeks, metrics/audit show zero regressions, explicit user approval.

| Order | Candidate | Class today | Action |
| --- | --- | --- | --- |
| ~~1~~ | ~~`lib/dual-brand/sync-journal.ts` shim~~ | **REMOVED 11B** | Done — imports → `journal-ingest` |
| ~~2~~ | ~~`lib/observability/log.ts` `apiLog` wrapper~~ | **REMOVED 11B** | Done — 6 callers → `platformLog` |
| ~~3~~ | `@deprecated` types in `platform/services/types.ts`, `content/index.ts` barrel | **REMOVED 11C** | Barrel exports removed; `ContentRef` / mappers kept |
| ~~4~~ | ~~`platformFeatures` deprecated alias~~ | **REMOVED 11B** | Done — barrel + test updated |
| 5 | Dual-path **legacy branches** in six upload/sign routes | **B→D** | Remove legacy branch after `PLATFORM_MEDIA_ENABLED` stable |
| 6 | `legacySyncBlogPostsMirotech` / `legacyPatch*` branches | **B→D** | Remove after `PLATFORM_PUBLISHING_ENABLED` stable |

**Not in first batch:** `storage-r2`, admin R2 manager, handoff tokens, Prisma CMS routes, `journal-ingest`, hub-remote-write.

---

## 10. High-risk — must stay until explicit program completion

1. **`lib/storage-r2.ts`** — all media I/O
2. **Admin R2 manager** (`/admin/r2`, `/api/admin/r2/*`) — operational control plane
3. **Prisma CMS write routes** — work, portfolio, blog, site settings
4. **`journal-ingest.ts` + `hub-remote-write.ts`** — publish domain layer (not legacy)
5. **Legacy admin auth** — session cookies, `authorizeAdminRequest`
6. **Handoff (`ho1`)** — until SSO proven in production
7. **Client delivery paths** — gallery, package, final-package, `/api/media/public`
8. **Google Sheet / upload-watcher pipeline** — external ops dependency
9. **`lib/truth/*`** — frozen executable locks (separate program)

---

## 11. Unknown — investigate before classification change

| Item | Why unknown |
| --- | --- |
| `MediaService.registerAsset()` | Implemented; no route registration |
| `lib/services/storage.ts` | Thin wrapper; minimal callers |
| `lib/portfolioPillars.ts` deprecated exports | Possible dynamic/config references |
| `studio-hub.ts` write re-export call graph | Partial migration |
| Production exercise of platform flags (except identity) | No durable telemetry in 11A |
| Cron `/api/cron/platform-jobs` in production | Requires Vercel cron + flag audit |
| Orphan routes `/admin/contracts/*`, `/studio/invoices/*` | Functional but off default nav |

---

## 12. Phase 11B+ suggested sequence

1. **Enable flags in staging** — one domain at a time (content → media → publishing → jobs → audit)
2. **Collect evidence** — `GET /api/admin/platform/metrics`, audit events, manual publish smoke
3. **Backfill assets** — registry before retiring R2 scan for Studio media
4. **~~First deletion PR~~ — shims + deprecated types only (batch 1 above)** — **Phase 11B complete** (3 shims/aliases removed; type cleanup deferred to 11C)
5. **Phase 11C** — flag inventory consolidated in `lib/platform/features.ts`; **no PLATFORM_* env vars removed** (dual paths active); dead deprecated barrel exports removed
6. **Phase 11D** — database legacy field retirement **analysis** (coverage + recommendations); **no schema changes**
7. **Second deletion PR** — dual-path legacy branches after ≥2 week prod flag
8. **Handoff retirement** — only after SSO metrics stable and `LEGACY_ADMIN_HANDOFF_ENABLED=false` trial
9. **Admin route consolidation** — link-only until editors move to Studio (separate phase)

---

*Phase 11A complete. No code removed.*
