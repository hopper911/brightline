# Publishing decoupling inventory (Phase 6D)

**Goal:** Brightline application routes provide `ContentRef` + target + intent; Mirotech schema transformation lives in `lib/platform/publishing/mirotech/`.

## Direct coupling matrix

| Location | Coupling | Phase 6D action |
| --- | --- | --- |
| `lib/platform/publishing/mirotech/journal-ingest.ts` | **Owner** — blog→journal transform + ingest | Created |
| `lib/platform/publishing/mirotech/hub-remote-write.ts` | **Owner** — hub CMS HTTP writes | Created |
| `lib/platform/publishing/mirotech/remote-client.ts` | **Owner** — bearer + fetch | Created |
| `lib/dual-brand/sync-journal.ts` | Legacy shim re-export | Kept |
| `lib/dual-brand/studio-hub.ts` | DTO types + read helpers; writes delegate to mirotech layer | Refactored |
| `app/api/admin/blog-posts` | Uses `resolveBlogPostsMirotechSync` | Phase 6C |
| `app/api/admin/studio-hub/[id]` PATCH | Uses `resolveStudioHubProjectPatch` | **Migrated 6D** |
| `app/api/admin/studio-hub/[id]/blog` PATCH | Uses `resolveStudioHubBlogPatch` | **Migrated 6D** |
| `app/api/admin/mirotech/sync-status` | Uses `isMirotechRemotePublishConfigured` | **Migrated 6D** |
| `scripts/resync-mirotech-journal.ts` | Imports `journal-ingest` directly | **Migrated 6D** |
| `app/api/admin/studio-hub` POST | Still `createHubProject` shim | Remaining |
| `lib/admin-r2-mirotech-cms-rewrite.ts` | Direct `updateHubProject` | Remaining (ops) |
| Public/read paths (`content-api`, work pages) | HTTP read only | Out of scope (ContentService) |

## Transformation ownership

| Transform | Owner module |
| --- | --- |
| Brightline `BlogPost` → Mirotech journal ingest JSON | `mirotech/journal-ingest.ts` |
| Hub project/blog CMS patch bodies | Mirotech Content API (authoritative); Brightline sends sanitized patch only |
| Media URL resolution for Mirotech | `journal-ingest.ts` (`resolveMediaUrlForMirotech`) |
| Case study section templates (UI) | `lib/dual-brand/case-study-template.ts` (editor only, not publish transport) |

## Import boundary

**Preferred for new admin publish code:**

- `@/lib/platform/publishing/integrations/*` (flag-gated resolvers)
- `@/lib/platform/publishing/mirotech/*` (domain layer)

**Avoid in application routes:**

- `@/lib/dual-brand/sync-journal` (legacy shim — use publishing integrations)
- Direct `updateHubProject` / `syncBlogPostToMirotech` in `app/api/**`

## Criteria to delete legacy publish path (future)

1. `PLATFORM_PUBLISHING_ENABLED=true` in production for ≥2 weeks with zero publish regressions
2. All publish callers use PublishingService integrations (hub POST, R2 rewrite batch, automation)
3. Parity tests green; audit events complete under `PLATFORM_AUDIT_ENABLED`
4. Explicit user approval to remove shims in `sync-journal.ts` and write re-exports in `studio-hub.ts`
