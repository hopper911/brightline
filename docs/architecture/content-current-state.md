# Content Architecture — Current State (Phase 5A Inventory)

**Document date:** 2026-08-28  
**Repository:** `brightline/` (Brightline Photography Next.js application)  
**Related deploy:** MiroTech Solutions at `https://mirotech.solutions` (separate Postgres + CMS; integrated via HTTP)

This document describes **what exists today** for content ownership, lifecycle, identity, and cross-brand coupling. It is observational only — not a target implementation.

**Companion ADR:** [ADR-006 — Content Service](./ADR-006-content-service.md)

---

## 1. Architecture overview

```
Brightline App (this repo)
      │
      ├────→ Brightline domain (Neon Postgres + SiteSetting JSON)
      │         WorkProject · StudioProject · Gallery · Design · pages · blog
      │
      ├────→ lib/dual-brand/* (HTTP seam to Mirotech Content API)
      │         Studio Hub publish · journal sync · public read mirror
      │
      └────→ lib/platform/content/ (Phase 5A — types + contract only; flag off)

MiroTech App (external deploy)
      │
      └────→ Mirotech CMS DB + R2 mirotech-site vault
                case studies · journal · homepage · site pages · resume
```

**No shared content database.** Cross-brand linkage uses string IDs (`brightlineExternalId`, `mirotechJournalId`) and bearer-authenticated HTTP APIs.

---

## 2. Brightline content models

### 2.1 Relational (Prisma / Neon)

| Model | Table | Public identity | Admin identity | Publish / status |
| --- | --- | --- | --- | --- |
| **WorkProject** | `WorkProject` | `slug` + pillar (`section`) → `/work/{pillar}/{slug}` | `id` (cuid) | `published` bool; `isFeatured`, `sortOrder` |
| **StudioProject** | `StudioProject` | `slug` → `/work/{slug}` | `id` (uuid) | `published` bool; ops `ProjectStatus`; marketing `ContentStatus` |
| **WorkCaseStudy** | `WorkCaseStudy` | `slug` | `id` (cuid) | `WorkStatus` enum; 1:1 `StudioProject` |
| **PortfolioProject** | `PortfolioProject` | `categorySlug` + `slug` (legacy; redirects to Work) | `id` (cuid) | `published` bool |
| **PortfolioImage** | `PortfolioImage` | — | `id` (cuid) | optional `assetId` → `PlatformAsset` |
| **DesignProject** | `DesignProject` | `slug` → `/design/{slug}` | `id` (cuid) | `published`, `featured`; `DesignPortfolioStatus` |
| **Gallery** (client) | `Gallery` | `slug` → `/client/{slug}` (token required) | `id` (cuid) | `published` bool + `GalleryStatus` |
| **GalleryImage** / **GalleryVideo** | — | — | cuid | sort/hero metadata |
| **DeliveryPackage** | `DeliveryPackage` | `accessToken` → `/package/{token}` | `id` (cuid) | `status` string (default `draft`) |
| **MediaAsset** | `MediaAsset` | R2 keys | `id` (cuid) | join target for Work/Studio media |
| **StudioMedia** | `StudioMedia` | R2 keys | `id` (cuid) | `MediaVisibility`; approval flags |
| **StudioGallery** | `StudioGallery` | access code | `id` (cuid) | `GalleryStatus`, `GalleryType` (Studio OS) |
| **Testimonial** | `Testimonial` | — | `id` (cuid) | `published` bool |
| **SiteBackgroundVideo** | `SiteBackgroundVideo` | `slug` | `slug` | `isActive`, `enabled` |
| **Project** (legacy client portal) | `Project` | `slug` | `id` (cuid) | `published` bool |

**Key modules:** `lib/queries/work.ts`, `lib/studio/studio-project-cms.ts`, `lib/queries/design.ts`, `lib/queries/public-galleries.ts`

**Admin surfaces:** `/admin/work`, `/admin/projects`, `/admin/galleries`, `/admin/portfolio`, `/admin/design`

**API routes:** `/api/admin/work-projects/*`, `/api/projects/*`, `/api/admin/galleries/*`, `/api/admin/portfolio/*`

### 2.2 JSON blob CMS (`SiteSetting`)

Stored as `SiteSetting.key` + JSON string in Postgres — not normalized tables.

| Key | Module | Content | Lifecycle |
| --- | --- | --- | --- |
| `website_pages:v1` | `lib/website-pages.ts` | Block pages: home, about, services, work, blog, galleries, contact | per-page `status`: `DRAFT` \| `PUBLISHED` |
| `service_pages:v1` | `lib/service-pages.ts` | Service marketing pages | slug-based; merged with `app/services/data.ts` defaults |
| `blog_posts:v1` | `lib/blog-posts.ts` | Journal + travel posts | `BlogPostStatus`: `DRAFT` \| `PUBLISHED` |
| `work_pillars:v1` | `lib/work-pillar-settings.ts` | Work taxonomy + dual-brand hub pillar | visibility toggles |
| `design_section:v1` | `lib/design-section-settings.ts` | Design nav/hub | CMS-gated |
| `page_backgrounds:v1` | `lib/page-backgrounds.ts` | Per-route backgrounds | — |
| `site_theme:v1` | `lib/site-theme.ts` | Global theme | — |
| `site_nav:v1` | `lib/site-nav.ts` | Nav overrides | — |
| `homepage_featured_media_id` | `lib/queries/site.ts` | Homepage hero `MediaAsset.id` | — |

**Admin:** `/admin/pages`, `/admin/services`, `/admin/blog`, `/admin/work-pillars`, `/admin/navigation`

**API:** `/api/admin/website-pages`, `/api/admin/service-pages`, `/api/admin/blog-posts`, `/api/admin/work-pillars`

### 2.3 Static / code-only

| Source | Path | Identity |
| --- | --- | --- |
| Static case studies | `lib/caseStudies.ts` | `slug` in code array |
| Default services | `app/services/data.ts` | `slug` (overridden by CMS) |
| Strategic locks | `lib/truth/*`, `lib/config/strategicPositioning.ts` | frozen copy |

### 2.4 Public routes (Brightline-native)

| Surface | Route | Source |
| --- | --- | --- |
| Homepage | `/` | `website_pages` + Work + blog + featured media |
| Work hub | `/work` | pillars + `WorkProject` + dual-brand pillar card |
| Work case study | `/work/{pillar}/{slug}` | `WorkProject` |
| Studio CMS case study | `/work/{slug}` | `StudioProject` (when slug matches) |
| Services | `/services`, `/services/{slug}` | `service_pages` |
| Journal | `/blog/{slug}`, `/travel/{slug}` | `blog_posts:v1` |
| Design | `/design/{slug}` | `DesignProject` |
| Client gallery | `/client/{gallerySlug}` | `Gallery` + token session |
| Legacy slug resolver | `/{slug}` | StudioProject, WorkProject, Gallery, website page |

---

## 3. MiroTech content models

MiroTech CMS **source code and Postgres schema are not in this repository**. Brightline integrates via HTTP clients and admin proxies.

### 3.1 Logical models (Mirotech deploy)

| Domain | Storage | Public URL (Mirotech) | Brightline access |
| --- | --- | --- | --- |
| Case studies / hub projects | Mirotech Postgres | `/work/{slug}` | `lib/dual-brand/studio-hub.ts` (write), `content-api.ts` (read) |
| Journal | Mirotech Postgres | `/journal/{slug}` | same |
| Homepage | Mirotech CMS | `/` | Admin handoff only — `/admin/mirotech` |
| Site pages | Mirotech CMS | various | Handoff only |
| Resume | R2 `resume/` + CMS | `/resume` (typical) | R2 tools; not modeled in Brightline Prisma |

### 3.2 Hub project shape (`HubProject`)

**Module:** `lib/dual-brand/studio-hub.ts`

| Field | Role |
| --- | --- |
| `id` | Hub UUID (primary key on Mirotech) |
| `slug` | URL slug on both sites when published |
| `status` | `"PUBLISHED"` vs draft |
| `publishBrightline` / `publishMirotech` | Per-site publish toggles |
| `brightlineExternalId` | Link back to Studio CMS editor context |
| `brightlineSection` | Brightline work pillar slug |
| `sections[]` | Case study blocks (text, gallery, video, …) |
| Media keys | `heroImage`, `thumbnailImage`, `backgroundMedia`, … (R2 object keys) |

### 3.3 Hub journal (`HubJournalPost`)

| Field | Role |
| --- | --- |
| `id`, `slug` | Mirotech journal identity |
| `caseStudyId` | Parent hub project |
| `primarySite` | `BOTH` \| `BRIGHTLINE` \| `MIROTECH` |
| `titleBrightline`, `bodyBrightline`, … | Brightline-specific variants |
| `articlePayload` | Structured blocks (gallery, case study, linked work) |

### 3.4 Content API endpoints (consumed by Brightline)

| Endpoint | Client |
| --- | --- |
| `GET /api/content/v1/work?site=BRIGHTLINE\|MIROTECH` | `lib/dual-brand/content-api.ts` |
| `GET /api/content/v1/work/{slug}?site=…` | same |
| `GET /api/content/v1/journal?site=…` | same |
| `POST /api/content/v1/journal/ingest` | `lib/dual-brand/sync-journal.ts` |
| `/api/content/v1/projects` CRUD | `lib/dual-brand/studio-hub.ts` |

**Auth:** `CONTENT_API_SECRET` or `MIROTECH_ADMIN_HANDOFF_SECRET` (≥16 chars)

### 3.5 Brightline public mirror routes (Mirotech-sourced)

| Route | Data |
| --- | --- |
| `/work/shared/{slug}` | `fetchDualBrandWorkBySlug()` |
| `/blog/shared/{slug}` | `fetchDualBrandJournalBySlug()` |
| `/work/{hubPillarSlug}` | Dual-brand pillar listing via `fetchDualBrandWork()` |

---

## 4. Shared / platform content

| Asset | Ownership | Brightline representation |
| --- | --- | --- |
| **PlatformAsset** | Tenant-scoped registry (`platform_assets`) | Optional FK from `PortfolioImage.assetId`; flag-gated |
| **PlatformTenant** | `brightline` \| `mirotech` | `lib/platform/tenants/registry.ts` |
| **R2 vaults** | `brightline` bucket → Brightline tenant; `mirotech-site` → Mirotech tenant | `lib/r2-vaults.ts` |
| **Cross-brand media refs** | Keys in Mirotech CMS JSON may point at Brightline `portfolio/` prefixes | `lib/admin-r2-mirotech-cms-keys.ts` |

Platform content is **infrastructure identity** (assets, tenants, storage), not editorial CMS documents.

---

## 5. Cross-published content

### 5.1 Dual-brand Studio Hub (case study)

| Aspect | Detail |
| --- | --- |
| **Source record** | `HubProject` on Mirotech CMS (authoritative store) |
| **Editor** | Brightline `/admin/studio-cms` → `StudioHubEditor.tsx` |
| **Write path** | `lib/dual-brand/studio-hub.ts` → `POST/PATCH /api/content/v1/projects` |
| **Brightline read** | `fetchDualBrandWork()` / `fetchDualBrandWorkBySlug()` when `publishBrightline` |
| **Mirotech read** | Mirotech public site when `publishMirotech` |
| **Transformation** | Case study template (`lib/dual-brand/case-study-template.ts`); photo narrative fields |
| **Destination models** | Mirotech case study DB; Brightline public via Content API (not local Prisma row) |
| **Asset handling** | R2 keys in hub JSON; may reference Brightline `portfolio/` or `mirotech-site` vault |
| **Slug handling** | Single shared `slug`; Brightline may also link via `brightlineSection` + local pillar URL |
| **Status** | `status === "PUBLISHED"` + per-site `publishBrightline` / `publishMirotech` |
| **Distribution helper** | `distributionStatus()` in `studio-hub.ts` → `off` \| `draft` \| `live` per target |
| **Deployment trigger** | HTTP write to Mirotech Content API; no Brightline redeploy required for Mirotech-only publish |

**URL resolution:** `dualBrandWorkHref()` — if `brightlineExternalId` + `brightlineSection` → `/work/{section}/{slug}`; else `/work/shared/{slug}`

### 5.2 Hub journal (per project)

| Aspect | Detail |
| --- | --- |
| **Source** | `HubJournalPost` on Mirotech |
| **Write** | `/api/admin/studio-hub/[id]/blog` → hub journal CRUD |
| **Read** | Content API + `/blog/shared/{slug}` on Brightline |
| **primarySite** | Controls which site owns canonical presentation |

### 5.3 Brightline blog → Mirotech journal sync

| Aspect | Detail |
| --- | --- |
| **Source record** | `BlogPost` in `blog_posts:v1` (`SiteSetting`) |
| **Trigger** | `PATCH /api/admin/blog-posts` → `syncBlogPostsToMirotech()` |
| **Destination** | Mirotech `JournalPost` via `POST /api/content/v1/journal/ingest` |
| **Linkage** | `publishToMirotech` flag; persisted `mirotechJournalId` on blog post |
| **Transformation** | `buildArticlePayload()` — gallery blocks, case study sections, media URL resolution |
| **Asset handling** | Relative/R2 URLs resolved to absolute Brightline public URLs for Mirotech |
| **Resync utility** | `scripts/resync-mirotech-journal.ts` |

### 5.4 Work pillar (dual-brand hub card)

| Aspect | Detail |
| --- | --- |
| **Config** | `work_pillars:v1` entry with `hub: "dual-brand"` (default slug `mirotech`) |
| **Public** | `/work/{pillarSlug}` mixes local `WorkProject` rows with Content API listings |
| **Constraint** | Only one dual-brand hub pillar allowed (`work-pillar-settings.ts`) |

---

## 6. Direct coupling discovered

| Severity | Location | Description |
| --- | --- | --- |
| **HIGH** | `lib/admin-media-library.ts` | Unified admin media: Brightline Prisma + Mirotech Content API + CMS key scan |
| **HIGH** | `components/admin/StudioHubEditor.tsx` | Dual-brand publish UI; raw `HubProject` shape |
| **HIGH** | `lib/dual-brand/studio-hub.ts` | Primary cross-brand write client |
| **HIGH** | `lib/dual-brand/sync-journal.ts` | Blog → Mirotech journal push on every blog save |
| **HIGH** | `lib/admin-r2-mirotech-cms-rewrite.ts` | R2 key moves rewrite Mirotech CMS JSON in place |
| **HIGH** | `lib/asset-health/registry.ts` | Merges Brightline DB refs + Mirotech CMS refs |
| **MEDIUM** | `lib/dual-brand/content-api.ts` | Public read coupling to Mirotech JSON shapes |
| **MEDIUM** | `app/api/admin/studio-hub/*` | Passthrough of raw Mirotech DTOs to admin UI |
| **MEDIUM** | `app/api/admin/blog-posts/route.ts` | Prisma SiteSetting save + sync in one handler |
| **MEDIUM** | `app/work/[section]/page.tsx`, `app/work/page.tsx` | Mixed local Prisma + HTTP dual-brand data |
| **MEDIUM** | `lib/admin-r2-mirotech-cms-keys.ts` | Content API walk for R2 dependency graph |
| **LOW** | `app/api/admin/mirotech/handoff/route.ts` | SSO redirect only |
| **LOW** | `lib/platform/assets/backfill/*` | Brightline-only; tenant-scoped |
| **NONE** | — | Direct cross-app Prisma queries (separate databases) |

---

## 7. Content lifecycle (existing — do not change)

### Brightline relational

| Domain | States |
| --- | --- |
| WorkProject | `published` boolean |
| StudioProject | `published` boolean; ops `ProjectStatus` (`INQUIRY` … `ARCHIVED`); marketing `ContentStatus` (`NONE` … `POSTED`) |
| WorkCaseStudy | `WorkStatus` (`NOT_STARTED` … `PUBLISHED` / `UPDATED`) |
| Gallery (client) | `GalleryStatus`: `DRAFT` → `SENT` → `CLIENT_REVIEWING` → `SELECTIONS_RECEIVED` → `DELIVERED` / `EXPIRED` / `ARCHIVED` |
| DesignProject | `DesignPortfolioStatus` includes `ARCHIVED` |
| DeliveryPackage | string `status` (default `draft`) |

### Brightline JSON CMS

| Domain | States |
| --- | --- |
| Website pages | `DRAFT` \| `PUBLISHED` |
| Blog posts | `DRAFT` \| `PUBLISHED` |

### Mirotech hub (via API)

| Domain | States |
| --- | --- |
| Hub project | `status`: `"PUBLISHED"` vs draft; plus `publishBrightline` / `publishMirotech` toggles |
| Hub journal | `status`: `PUBLISHED` \| `DRAFT`; `primarySite` for ownership |
| Distribution view | `distributionStatus()` → per-target `off` \| `draft` \| `live` |

---

## 8. Content identity

| Content type | Stable public ID | Stable admin/API ID | Notes |
| --- | --- | --- | --- |
| WorkProject | `slug` + pillar | `id` (cuid) | `@@unique([section, slug])` |
| StudioProject | `slug` | `id` (uuid) | Globally unique slug |
| Gallery | `slug` (not browsable without token) | `id` (cuid) | Access via token `id` / code hash |
| DesignProject | `slug` | `id` (cuid) | |
| Blog post (Brightline) | `slug` | `id` in JSON | Stored in SiteSetting |
| Website page | `slug` (`home` → `/`) | `id` in JSON | |
| Service page | `slug` | `slug` in JSON array | |
| Hub project | `slug` | `id` (UUID on Mirotech) | `brightlineExternalId` for cross-link |
| Hub journal | `slug` | `id` | `caseStudyId` parent |
| Blog sync | `slug` on both sides | Brightline `BlogPost.id`; Mirotech `mirotechJournalId` | |
| PlatformAsset | — | `id` (cuid) | Storage: `provider+bucket+objectKey` |

**Do not rename or migrate identifiers in Phase 5A.**

---

## 9. ContentRef design (Phase 5A)

Neutral platform reference — implemented in `lib/platform/content/types.ts`:

```typescript
type ContentRef = {
  tenant: "brightline" | "mirotech";
  type: ContentType;  // e.g. "dual-brand-work", "work-project", "blog-post"
  id: string;         // authoritative id in owning store
};
```

**Rules:**
- `tenant` is **required** — never resolve by `type + id` alone.
- `type` is a closed enum of known cross-domain and adapter-routable slugs — not arbitrary table names.
- Legacy Phase 1A `PlatformContentRef` (`tenantSlug`, `entityType`, `entityId`) maps via `contentRefFromPlatformLegacy()`.

---

## 10. ContentService contract (Phase 5A — interface only)

**Module:** `lib/platform/content/content-service.ts`  
**Flag:** `PLATFORM_CONTENT_ENABLED` (default **off**)  
**No default implementation** — existing `lib/dual-brand/*` paths remain authoritative.

| Method | Justification |
| --- | --- |
| `resolveReference(ref)` | Cross-service linking, audit resource ids, admin pickers |
| `getPublished(ref)` | Wraps Content API + public Prisma reads for dual-brand surfaces |
| `getDistribution(ref)` | Exposes `distributionStatus()` semantics for hub + sync content |
| `listPublished?(type)` | Future: migrate `/work` dual-brand listing behind service |

**Explicitly excluded from ContentService:**
- Generic `tableName` CRUD
- Raw Prisma model passthrough
- Arbitrary query execution
- Domain-only Brightline page editing (stays in existing admin routes)

**Write operations** (create draft, publish, archive) belong to a future **PublishingService** (`PLATFORM_PUBLISHING_ENABLED`) wrapping Studio Hub and journal sync — not generic ContentService CRUD.

---

## 11. Adapter strategy (design only)

```
ContentService
      │
      ├── BrightlineContentProvider (future)
      │     WorkProject · StudioProject · Gallery · SiteSetting blog/pages
      │
      └── MiroTechContentProvider (future)
            wraps lib/dual-brand/content-api.ts + studio-hub.ts read paths
```

**Legacy seam (keep until strangler cutover):** `lib/dual-brand/*`

Planned integrations directory (5B+): `lib/platform/content/integrations/`

---

## 12. Security findings (major risks)

| Risk | Location | Mitigation today |
| --- | --- | --- |
| Cross-tenant content read if tenant omitted | Future ContentService adapters | `assertValidContentRef()` requires tenant; adapters must verify `tenantOwnsContentType()` |
| Unauthenticated mutation | `/api/content/v1/*` on Mirotech | Bearer secret; Brightline proxies require admin session + CSRF |
| Admin route leakage of raw Mirotech DTOs | `/api/admin/studio-hub/*` | Admin cookie gate + CSRF; DTOs still expose internal Mirotech shape to authenticated admin |
| Unvalidated content type in generic handler | Not present today — no generic CMS router | Closed `ContentType` enum prevents arbitrary model selection |
| Cross-tenant R2/CMS rewrite | `admin-r2-mirotech-cms-rewrite.ts` | Admin-only; requires explicit vault + key approval workflow |
| Journal sync without config | `sync-journal.ts` | Skips when bearer not configured; errors logged per post |

---

## 13. Overlaps / migration notes

- **Three work systems:** `WorkProject`, `StudioProject`, dual-brand Content API — coexist intentionally.
- **Portfolio** tables remain; public routes redirect to Work.
- **Two gallery systems:** client `Gallery` vs Studio OS `StudioGallery`.
- **Most marketing CMS is SiteSetting JSON** — ContentService must not flatten these into generic tables.
- **Platform asset registry** (Phase 4) is separate from editorial content — link via media keys and optional `assetId`, not content documents.

---

## 14. Related documents

- [ADR-001 — Platform Foundation](./ADR-001-platform-foundation.md)
- [ADR-006 — Content Service](./ADR-006-content-service.md)
- [Current Architecture State (Phase 0)](./current-state.md)
- [Brightline ↔ MiroTech relations diagram](../brightline-mirotech-relations.mmd)
