# ADR-014: Studio Content + Media Integration (Phase 9B)

**Status:** Accepted  
**Date:** 2026-08-28  
**Depends on:** [ADR-012 Studio ops shell](./ADR-012-studio-ops-shell.md), [ADR-006 Content service](./ADR-006-content-service.md), [ADR-004 Media service](./ADR-004-media-service.md)

## Context

Phase 9A shipped `/studio/ops` as a link-only operational shell. Operators need read-only content and media visibility through platform boundaries without duplicating admin CMS/R2 UIs.

## Decision

### Studio control plane routes

| Route | Service | Purpose |
| --- | --- | --- |
| `/studio/content` | ContentService | Tenant content hub |
| `/studio/content/brightline` | ContentService | Work + portfolio listings |
| `/studio/content/mirotech` | ContentService | Hub + case study listings |
| `/studio/media` | Asset Registry | Tenant asset browser |
| `/studio/media/[assetId]` | Asset Registry | Read-only detail |

Editors remain at existing `/admin/*` routes — Studio links out, does not embed editors.

### Platform extensions (minimal)

1. **ContentService.listPublished** — wired through tenant adapters (types already supported in Phase 5B/5C).
2. **PlatformAssetRegistryService.listByTenant** — paginated Prisma query on `platform_assets` (no R2 scan).

### Tenant + permissions

- Active tenant from `studio_ops_tenant` cookie drives media listing and cross-tenant redirects on content sub-routes.
- RBAC via existing permissions; legacy admin retains full access during transition:
  - Brightline content: `brightline.journal.read`
  - Mirotech content: `mirotech.project.read`
  - Media: `platform.media.read`

### Partial asset coverage

Studio media shows **registry rows only**. Legacy R2 objects without registry entries are documented as out of scope; admin R2 tools linked as fallback.

## Consequences

**Positive:** Studio consumes platform services; no direct Prisma/R2 from UI; tenant-safe listings.

**Negative:** Content types not yet migrated to adapters remain unavailable; asset list incomplete until backfill.

## Rollback

Remove `/studio/content` and `/studio/media` routes. Revert ops nav hrefs to `/studio/ops/content`. Optional: keep `listPublished` (backward compatible).
