# ADR-006: Platform Content Service

**Status:** Accepted  
**Date:** 2026-08-28  
**Depends on:** [ADR-002](./ADR-002-tenant-context.md), [ADR-001](./ADR-001-platform-foundation.md)  
**Inventory:** [content-current-state.md](./content-current-state.md)

## Context

Brightline and MiroTech operate as **separate deploys** with separate Postgres databases. Editorial content today lives in:

- Brightline **Prisma models** (`WorkProject`, `Gallery`, …)
- Brightline **`SiteSetting` JSON blobs** (website pages, blog, services)
- MiroTech **CMS database** (case studies, journal, homepage — external to this repo)

Cross-brand workflows already exist via `lib/dual-brand/*` (Studio Hub publish, journal sync, Content API reads). There is **no shared content schema** and no direct cross-app Prisma access.

Phase 5A must define a **platform-facing content boundary** without:

- Replacing CMS routes
- Changing publishing behavior
- Moving or renaming content tables
- Merging Brightline and MiroTech schemas
- Introducing a generic CRUD layer over every database table

## Decision

Introduce **`lib/platform/content/`** as the typed contract for **cross-domain and platform content operations only**.

```
Brightline App                          MiroTech App
      │                                       │
      ├──── Brightline domain                 └──── MiroTech domain
      │     (Prisma + SiteSetting)                  (CMS DB — external)
      │
      └──── ContentService (flag-gated, future impl)
                 │
                 ├── BrightlineContentProvider (adapter)
                 └── MiroTechContentProvider (adapter)
```

Domain-only content **stays in domain modules**. ContentService is not a universal CMS.

### Why ContentService is NOT a universal CMS

| Anti-pattern | Why rejected |
| --- | --- |
| Generic `tableName` CRUD | Encourages cross-tenant leaks and bypasses domain validation |
| `executeRawQuery` / arbitrary Prisma | Breaks tenant ownership and publishing invariants |
| One schema for Work + Hub + Blog JSON | Would force migration of stable domain models |
| Replacing `/admin/*` routes in Phase 5 | Strangler fig — legacy routes remain authoritative until explicit cutover |

ContentService methods represent **domain intentions** (resolve reference, read published snapshot, read distribution state) — not database operations.

### Domain ownership classification

| Class | Examples | ContentService role |
| --- | --- | --- |
| **A. Brightline domain-only** | Client gallery, Studio OS ops, delivery packages, native WorkProject | No service required; optional adapter for future audit/linking |
| **B. MiroTech domain-only** | Homepage, resume, native site pages on mirotech.solutions | Read via MiroTech adapter + Content API only when Brightline surfaces need it |
| **C. Platform / shared** | `PlatformAsset`, `PlatformTenant`, R2 vault ownership | Owned by asset/tenant modules — referenced by content adapters, not duplicated |
| **D. Cross-published** | Studio Hub projects, hub journal, Brightline blog → Mirotech sync | **Primary ContentService scope** |

### ContentRef

Stable neutral reference for platform services:

```typescript
type ContentRef = {
  tenant: TenantSlug;   // required — "brightline" | "mirotech"
  type: ContentType;    // closed enum — not arbitrary table names
  id: string;           // authoritative id in owning store
};
```

Example:

```json
{
  "tenant": "mirotech",
  "type": "dual-brand-work",
  "id": "hub-project-uuid"
}
```

**Tenant boundary:** Adapters MUST reject refs where `ref.tenant` does not match the provider tenant or permitted cross-publish scope. `type + id` alone is never sufficient to resolve content.

Helpers: `assertValidContentRef()`, `contentRefKey()`, `tenantOwnsContentType()`.

Legacy Phase 1A shape:

```typescript
// deprecated
{ tenantSlug, entityType, entityId }
```

Maps via `contentRefFromPlatformLegacy()`.

### ContentService contract (Phase 5A — interface only)

**Module:** `lib/platform/content/content-service.ts`  
**Flag:** `PLATFORM_CONTENT_ENABLED` (default **off**)  
**Implementation:** deferred to Phase 5B+

| Method | Purpose | Current legacy equivalent |
| --- | --- | --- |
| `resolveReference(ref)` | Title, slug, lifecycle, public path — no full body | Partial: hub summaries, Prisma selects |
| `getPublished(ref)` | Published snapshot for public/cross-tenant read | `content-api.ts`, `queries/work.ts` |
| `getDistribution(ref)` | Per-brand `off` \| `draft` \| `live` | `distributionStatus()` in `studio-hub.ts` |
| `listPublished?(type)` | Optional listing for dual-brand surfaces | `fetchDualBrandWork()` |

**Not in ContentService (Phase 5A):**

- `createDraft` / `updateDraft` / `publish` / `archive` as generic operations — these map to **PublishingService** (`PLATFORM_PUBLISHING_ENABLED`) wrapping Studio Hub and journal sync with domain-specific payloads
- Full CMS document CRUD

### ContentProvider adapters

**Module:** `lib/platform/content/content-provider.ts`

```typescript
interface ContentProvider {
  readonly tenant: TenantSlug;
  supports(ref: ContentRef): boolean;
  resolveReference(context, ref): Promise<ContentReferenceSummary | null>;
  getPublished(context, ref): Promise<ContentPublishedSnapshot | null>;
  getDistribution?(context, ref): Promise<ContentDistributionSnapshot | null>;
}
```

| Adapter | Wraps (future) | Tenant |
| --- | --- | --- |
| `BrightlineContentProvider` | Prisma public queries + SiteSetting readers | `brightline` |
| `MiroTechContentProvider` | `lib/dual-brand/content-api.ts`, hub read helpers | `mirotech` |

**Phase 5A:** interfaces only — no adapter implementations unless trivial (none added).

**Legacy seam:** Keep `lib/dual-brand/*` until strangler cutover behind `PLATFORM_CONTENT_ENABLED`.

### Cross-publishing boundary

Cross-publish workflows are **documented, not refactored** in 5A:

| Workflow | Source | Write seam | Read seam |
| --- | --- | --- | --- |
| Dual-brand case study | `HubProject` (Mirotech DB) | `studio-hub.ts` | `content-api.ts` |
| Hub journal | `HubJournalPost` | `studio-hub.ts` blog routes | `content-api.ts` |
| Blog sync | `BlogPost` (`blog_posts:v1`) | `sync-journal.ts` on blog save | Brightline `/blog/*`; Mirotech `/journal/*` |

Future **PublishingService** owns write-side orchestration (publish toggles, ingest, idempotent sync). ContentService owns neutral read/reference semantics.

Asset handling during cross-publish remains on **MediaService / PlatformAsset** (ADR-004, ADR-005) — content adapters return payloads with storage keys; they do not move R2 objects.

### Lifecycle mapping

Adapters map domain-specific enums to neutral **`ContentLifecycleState`**:

`draft` | `published` | `archived`

Examples:

- `WorkProject.published` → `published` \| `draft`
- `BlogPostStatus.PUBLISHED` → `published`
- `HubProject.status === "PUBLISHED"` → `published`
- `GalleryStatus.ARCHIVED` → `archived`

**Do not introduce new status models** in domain tables during content migration phases.

### Security

| Risk | Mitigation |
| --- | --- |
| Cross-tenant read | `ContentRef.tenant` required; provider `supports()` checks tenant + type |
| Unauthenticated mutation | ContentService 5A is read-only; writes stay on authenticated admin routes + bearer Content API |
| Arbitrary model selection | Closed `ContentType` enum — no user-supplied table names |
| Raw DTO leakage | Future adapters map to `ContentPublishedSnapshot.payload`; admin passthrough routes migrated incrementally |

### Legacy compatibility

- All existing admin routes, public pages, and dual-brand HTTP clients **unchanged** in 5A
- `PLATFORM_CONTENT_ENABLED` defaults **false**
- No consumer imports required to migrate in 5A
- Phase 1A `PlatformContentService.getPublished(ref)` stub superseded by full interface in `content-service.ts` — still no runtime implementation

### Files added (Phase 5A)

| Path | Role |
| --- | --- |
| `lib/platform/content/types.ts` | `ContentRef`, `ContentType`, lifecycle/distribution types |
| `lib/platform/content/content-service.ts` | `ContentService` interface |
| `lib/platform/content/content-provider.ts` | `ContentProvider` adapter interface |
| `lib/platform/content/index.ts` | Barrel export |
| `lib/platform/content/types.test.ts` | Ref validation tests |
| `docs/architecture/content-current-state.md` | Inventory + coupling audit |
| `docs/architecture/ADR-006-content-service.md` | This ADR |

## Consequences

### Positive

- Clear boundary: domain CMS vs platform cross-brand reads
- Stable `ContentRef` for audit, publishing, and future search indexing
- Adapter pattern matches proven `lib/platform/media/` and `lib/platform/assets/` strangler fig

### Negative / deferred

- Two parallel paths until `PLATFORM_CONTENT_ENABLED` cutover (`dual-brand/*` + ContentService)
- Cross-publish writes remain split across Studio Hub, blog sync, and future PublishingService

## Phase 5B — Mirotech content adapter (2026-08-28)

Read-only **`MirotechContentAdapter`** implemented beside legacy routes (`PLATFORM_CONTENT_ENABLED` still off).

| Content type | `ContentRef.id` | Legacy seam |
| --- | --- | --- |
| `mirotech-case-study` | public slug | `fetchMirotechSiteWorkBySlug()` |
| `dual-brand-work` | hub project UUID | `getHubProject()` |

Files: `lib/platform/content/adapters/mirotech-content-adapter.ts`, `integrations/map-mirotech-content.ts`, `dto/mirotech-case-study.ts`, `errors.ts`, `server.ts`.

No public route or CMS handler migration in 5B.

## Phase 5C — Brightline content adapter (2026-08-28)

Read-only **`BrightlineContentAdapter`** for public marketing metadata only (`PLATFORM_CONTENT_ENABLED` still off).

| Content type | `ContentRef.id` | Excluded |
| --- | --- | --- |
| `work-project` | WorkProject cuid | delivery packages, final package tokens, client PDF ops, gallery data |
| `portfolio-project` | PortfolioProject cuid | image URLs, access codes, studio/client linkage |

Files: `lib/platform/content/adapters/brightline-content-adapter.ts`, `integrations/default-brightline-content-read.ts`, `dto/brightline-public-content.ts`.

No public route migration in 5C.

## Phase 5D — First content consumer migration (2026-08-28)

**Consumer:** Admin Work preview banner context (`/admin/work/preview/[id]`).

| | Legacy | Platform (flag on) |
| --- | --- | --- |
| Input | WorkProject id | Same `ContentRef` `{ tenant: brightline, type: work-project, id }` |
| Auth | `hasAdminAccess()` on page | Unchanged |
| Read | `fetchBrightlineWorkProjectById` + pillar settings | `defaultContentService.resolveReference` → Brightline adapter |
| Output | `AdminWorkPreviewContext` | Same external contract |
| Not found | `notFound()` | Same |
| Cache | `force-dynamic` | Unchanged |
| Case study body | `getWorkProjectByIdForPreview` | **Unchanged** (not migrated in 5D) |

Flag: **`PLATFORM_CONTENT_ENABLED`** (default **off**). Rollback: unset flag — legacy path only.

Files: `integrations/admin-work-preview-context.ts`, `default-content-service.ts`, `content-provider-registry.ts`.

## Recommended Phase 6A

1. **Second consumer** — e.g. `/work/shared/[slug]` metadata or portfolio admin reference lookup
2. **`mirotech-journal`** read adapter
3. **PublishingService** sketch for cross-brand writes
4. **Admin studio-hub API** DTO mapping at boundary

## Validation (Phase 5A)

- Lint, typecheck, tests, build — no runtime behavior change
- New tests: `lib/platform/content/types.test.ts`
