# ADR-007: Platform Publishing Service

**Status:** Accepted  
**Date:** 2026-08-28  
**Depends on:** [ADR-006](./ADR-006-content-service.md), [ADR-002](./ADR-002-tenant-context.md), [ADR-001](./ADR-001-platform-foundation.md)  
**Inventory:** [publishing-current-state.md](./publishing-current-state.md)

## Context

Brightline and MiroTech content can be saved and published through many paths today:

- Prisma boolean flags (`WorkProject.published`, `StudioProject.published`, …)
- SiteSetting JSON status fields (`DRAFT` / `PUBLISHED`)
- HTTP writes to Mirotech Content API (Studio Hub, journal ingest)
- Next.js `revalidatePath` after select admin saves
- Local CLI ingest (`blpublish`, sheet pipeline)

**ContentService (Phase 5)** formalized cross-domain **reads**. Publishing remains **write-side** and is still embedded in admin PATCH handlers — save and publish are often the same request.

Phase 6A must define a **platform-facing publishing boundary** without:

- Changing production publish behavior
- Changing deployment hooks (none exist in repo)
- Modifying cross-site records
- Introducing background jobs prematurely

## Decision

Introduce **`lib/platform/publishing/`** as the typed contract for **making content live** — separate from content storage and reads.

```
Admin / automation caller
        │
        ▼
PublishingService (flag-gated, future impl)
        │
        ├── BrightlinePublishingAdapter  → Prisma / SiteSetting + revalidatePath
        └── MiroTechPublishingAdapter    → Content API HTTP (hub, journal ingest)
```

### Content vs publishing

| Question | Service | Example |
| --- | --- | --- |
| What is this content? | **ContentService** | Resolve `work-project` metadata, read published snapshot |
| How does it go live? | **PublishingService** | Set published, push hub to Mirotech, revalidate cache |
| Where is it stored? | Domain stores | Prisma, SiteSetting, Mirotech CMS DB |

PublishingService **does not** replace CMS save endpoints in Phase 6A. It documents the intention future consumers will route through.

### Publish targets

Actual deploy topology — not speculative microservices:

| Target | Tenant | Mechanism |
| --- | --- | --- |
| `brightline-site` | `brightline` | This repo's Next.js app — DB/JSON state + ISR revalidation |
| `mirotech-site` | `mirotech` | Separate deploy — bearer Content API from Brightline server |

No Vercel deploy hook is a publish target in this architecture.

### PublishRequest (neutral)

```typescript
type PublishRequest = {
  source: ContentRef;           // from Phase 5 — tenant + type + id
  target: PublishTargetId;      // "brightline-site" | "mirotech-site"
  operation: PublishOperation;  // "publish" | "unpublish" | "sync"
};
```

- **`publish`** — make live on target (boolean/status flip + side effects)
- **`unpublish`** — take offline on target
- **`sync`** — push to cross-site target without implying local lifecycle change (blog → Mirotech journal)

### PublishResult (synchronous)

Observed production paths complete in the request handler. Phase 6A defines:

```typescript
type PublishOutcome = "completed" | "accepted" | "failed";
```

- **`completed`** — operation finished in this call (default for all current flows)
- **`accepted`** — reserved for Phase 7 async handoff (not used until jobs exist)
- **`failed`** — operation did not succeed

Optional `warnings[]` for partial success (e.g. local save ok, remote sync failed — matches blog PATCH today).

**No `getStatus(jobId)` in Phase 6A.** Phase 1A's sketch with `jobId` is superseded by this ADR.

### PublishingService contract

```typescript
interface PublishingService {
  publish(context: PlatformContext, request: PublishRequest): Promise<PublishResult>;
}
```

Future Phase 7 may add `submitPublish` returning `{ jobId }` + `getStatus` — only when a job queue exists.

### Adapter strategy

| Adapter | Wraps (future 6B+) | Typical requests |
| --- | --- | --- |
| **BrightlinePublishingAdapter** | Work/portfolio/blog/pages PATCH paths, `publishStudioProjectRecord`, `revalidatePath` | `target: brightline-site` |
| **MiroTechPublishingAdapter** | `studio-hub.ts`, `sync-journal.ts` | `target: mirotech-site`, cross-brand refs |

PublishingService selects adapter by `request.target` and validates `source.tenant` ownership via ContentRef rules.

Cross-brand hub publish may require **orchestration** (one admin save → Mirotech write + optional Brightline distribution flags) — implement in 6B as explicit multi-step `PublishResult.effects`, not hidden in ContentService.

### Authorization

Publishing is **always privileged**:

| Current gate | Applies to |
| --- | --- |
| `authorizeAdminRequest` | Admin CMS routes |
| `rejectCrossSiteMutation` | CSRF on admin mutations |
| Bearer secrets | Mirotech Content API server-to-server |
| `requireProjectsApiAuth` | Automation publish endpoint |

PublishingService implementations MUST require `PlatformContext` with authenticated operator identity (future) and MUST NOT expose public unauthenticated publish endpoints.

Phase 6A defines types only — authorization stays on legacy routes until cutover.

### Idempotency (document, do not fix)

| Flow | Risk if repeated |
| --- | --- |
| Boolean publish toggle | Low — idempotent |
| `revalidatePath` | Low |
| Journal ingest upsert | Low — keyed by `brightlinePostId` / `mirotechJournalId` |
| Hub project POST create | **High** — may duplicate without idempotency key |
| Sheet pipeline READY rows | **Medium** — depends on sheet status updates |

Adapters SHOULD document idempotency per content type in Phase 6B; Phase 6A records inventory only.

### Backward compatibility

- `PLATFORM_PUBLISHING_ENABLED` defaults **false**
- No admin route changes in 6A
- Legacy `PlatformPublishTarget` (Phase 1A) mapped via `publishRequestFromLegacyTarget()`
- Cross-site records untouched

### Relationship to ContentService

- Publishing **uses** `ContentRef` for source identity
- ContentService **does not** perform writes or cache invalidation
- `getDistribution()` on ContentService describes live state; PublishingService **changes** that state

## Consequences

**Positive**

- Clear separation of read (5) vs publish (6) platform capabilities
- Target abstraction matches two-deploy reality
- Room for async jobs in Phase 7 without breaking sync contract

**Negative / tradeoffs**

- Save/publish conflation in legacy routes remains until 6B+ cutover
- Cross-brand orchestration complexity deferred to adapter implementations

## Rollback

Delete `lib/platform/publishing/` — nothing routes through it in Phase 6A.

## Recommended Phase 6B

1. **`DefaultPublishingService`** + provider registry behind `PLATFORM_PUBLISHING_ENABLED`
2. **First publish consumer** — e.g. blog save → extract Mirotech sync behind adapter (flag off = legacy inline sync)
3. **Idempotency keys** for hub create + sheet pipeline (design only if not implementing)
4. **Operator context** on `PlatformContext` for publish audit (optional, flag-gated)

## Phase 6B — Mirotech publishing adapter foundation (2026-08-28)

**Target:** `mirotech-site` — Brightline `blog-post` → Mirotech journal ingest.

| | Detail |
| --- | --- |
| Adapter | `MirotechPublishingAdapter` |
| Delegates to | `syncBlogPostToMirotech` (`lib/dual-brand/sync-journal.ts`) |
| Read port | `getBlogPostById` |
| Operations | `sync` (legacy parity), `publish` (validates opt-in + status), `unpublish` (sets `publishToMirotech: false`) |
| Service | `DefaultPublishingService` + `DefaultPublishingProviderRegistry` |
| Auth | Caller-verified — service does not re-check admin session |
| Audit | None in adapter — blog PATCH remains authoritative |
| Idempotency | **Partially safe** — journal ingest upserts by `brightlinePostId` |
| Consumer migration | **None** — `PATCH /api/admin/blog-posts` unchanged |

Flag `PLATFORM_PUBLISHING_ENABLED` not wired in 6B.

## Recommended Phase 6C

1. **First publish consumer cutover** — blog PATCH behind `PLATFORM_PUBLISHING_ENABLED`
2. **BrightlinePublishingAdapter** — local SiteSetting revalidate + status
3. **Hub dual-brand-work** publish path via `updateHubProject`
4. **Publish audit** at service boundary when flag on (avoid duplicate with legacy)

## Validation (Phase 6A)

- `lib/platform/publishing/types.test.ts`
- No production route imports
- Lint on new files
