# ARCHITECTURE MIGRATION REPORT — PHASE 9B

**Studio Media + Content Integration**  
**Date:** 2026-08-28  
**Branch:** `architecture/platform-foundation`  
**ADR:** [ADR-014-studio-content-media.md](./ADR-014-studio-content-media.md)

---

## 1. Studio state before migration

| Area | Before 9B |
| --- | --- |
| `/studio/ops` | Link grids only (content, media → `/admin/*`) |
| Tenant switcher | Cookie + RBAC; not used for data fetching |
| Content UI | No ContentService listings in Studio |
| Media UI | No registry browser in Studio |
| Platform listing | `ContentService.listPublished` returned `[]` |
| Asset listing | No tenant list on registry service |

---

## 2. Content integrations added

| Route | Content types |
| --- | --- |
| `/studio/content/brightline` | `work-project`, `portfolio-project` |
| `/studio/content/mirotech` | `dual-brand-work`, `mirotech-case-study` |

Read-only tables with lifecycle, slug, public link, and **Edit in admin** deep links.

---

## 3. Media integrations added

| Route | Source |
| --- | --- |
| `/studio/media` | `PlatformAssetRegistryService.listByTenant` |
| `/studio/media/[assetId]` | `findById` + tenant guard |

Partial coverage banner; pagination via `?cursor=`; admin media tool links retained.

---

## 4. Platform services consumed

| Service | Usage |
| --- | --- |
| **PlatformContext** | `createPlatformContextForTenant(activeTenant)` |
| **ContentService** | `listPublished` per adapter-supported type |
| **MediaService** | Not used for listing (registry is correct layer) |
| **Asset Registry** | `listByTenant`, `findById` |
| **AuthorizationService** | Permissions from `resolveStudioOpsContext` |

---

## 5. Direct DB/R2 access avoided

- Studio pages import `lib/studio/content/*` and `lib/studio/media/*` only.
- Prisma queries live in content read ports and asset repository (platform layer).
- No R2 bucket scans from Studio routes.

---

## 6. Tenant handling

- Media listing uses **active tenant** from cookie.
- Content sub-routes enforce tenant match for non-legacy users (redirect to active tenant).
- Cross-tenant asset detail returns 404.

---

## 7. Permissions

| Surface | Permission |
| --- | --- |
| Brightline content | `brightline.journal.read` |
| Mirotech content | `mirotech.project.read` |
| Media | `platform.media.read` |
| Legacy admin | Bypass (secondary to RBAC when identity enabled) |

Denied users receive `notFound()` — no silent cross-tenant leak.

---

## 8. Partial asset coverage behavior

- Registry disabled → empty state + env hint (`PLATFORM_ASSET_REGISTRY_ENABLED`).
- Registry enabled → only registered assets; amber banner explains partial coverage.
- Legacy admin links to unified media library and R2 manager unchanged.

---

## 9. Existing admin tools reused

| Content type | Admin editor link |
| --- | --- |
| work-project | `/admin/work/[id]` |
| portfolio-project | `/admin/portfolio` |
| dual-brand-work | `/admin/studio-cms/[id]` |
| mirotech-case-study | Mirotech handoff |

No CMS/R2 editors copied into Studio.

---

## 10. Tests

| Suite | Coverage |
| --- | --- |
| `lib/studio/access.test.ts` | Permissions, tenant match, edit hrefs |
| `lib/studio/content/list-studio-content.test.ts` | Flag gate, tenant types |
| `lib/studio/media/list-studio-assets.test.ts` | Registry gate, cross-tenant block |
| `lib/platform/content/default-content-service.test.ts` | `listPublished` routing |

**17 tests passing** in Phase 9B suites.

---

## 11. Runtime impact

- Content: bounded list queries (limit 30–50) via adapters; Mirotech lists may fetch remote catalogs once per request (existing hub/API pattern).
- Media: single paginated Prisma query per page.
- No new cache/Redis infrastructure.

**Build note:** Full `npm run build` fails on pre-existing unrelated webpack/ESM issues in contracts/jsdom — not introduced by 9B.

---

## 12. Remaining Studio gaps

- Unsupported content types (blog, journal, design, pages) not listed until adapters exist.
- No content→asset association UI (asset IDs not yet on content summaries).
- No destructive asset ops in Studio.
- Ops shell still dual-nav with AdminNav.

---

## 13. Recommended Phase 9C

1. Wire `listPublished` pagination cursors in Studio UI (next page buttons per section).
2. Surface linked asset IDs on portfolio/work when registry backfill completes.
3. Embed high-traffic admin views via deep-link panels (not iframe duplication).
4. Enforce `platform.media.read` on `/api/admin/media` and R2 routes.
5. Consolidate `/studio/ops` and `/studio/content|media` under one nav shell.

---

## Files added / changed

**New routes:** `app/studio/content/*`, `app/studio/media/*`  
**New libs:** `lib/studio/access.ts`, `lib/studio/content/*`, `lib/studio/media/*`, `lib/studio/platform-nav.ts`  
**New components:** `StudioPlatformShell`, `StudioContentTable`, `StudioMediaTable`  
**Platform:** `listPublished` adapters, `listPlatformAssetsByTenantSlug`, registry `listByTenant`  
**Docs:** ADR-014, this report
