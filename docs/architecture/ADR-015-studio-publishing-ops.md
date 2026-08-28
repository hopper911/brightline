# ADR-015: Studio Publishing Operations (Phase 9C)

**Status:** Accepted  
**Date:** 2026-08-28  
**Depends on:** [ADR-014 Studio content/media](./ADR-014-studio-content-media.md), [ADR-007 Publishing](./ADR-007-publishing-service.md), [ADR-008 Jobs](./ADR-008-background-jobs.md)

## Context

Publishing and job infrastructure exist (Phase 6–7) but operators only had admin-scattered controls and link grids. Studio needs a unified publishing control plane without reimplementing adapters.

## Decision

### Routes

| Route | Purpose |
| --- | --- |
| `/studio/publishing` | Job counts + recent publishing jobs |
| `/studio/publishing/jobs/[jobId]` | Safe failure detail + retry |
| `POST /api/studio/publishing/jobs/[id]/retry` | JobService.runJob on FAILED publishing jobs |
| `POST /api/studio/publishing/sync-blog` | Single blog → Mirotech via PublishingService or enqueue |

### Services consumed

- **JobService** — status via repository, retry via `runJob`
- **PublishingService** — sync path when jobs async off
- **publishing-enqueue** — async journal sync when jobs on
- **Audit** — `publishing.started/completed/failed` on Studio-initiated actions (no duplicate enqueue audit)

### Permissions

- View: `brightline.journal.publish` OR `mirotech.journal.publish` (legacy admin bypass)
- Brightline sync: `brightline.journal.publish`
- Retry: tenant-scoped publish permission matching job tenant

### Safety

- Job detail exposes summary fields only — no stack traces, secrets, or full payload
- Retry limited to `publishing.*` types, `FAILED` status, attempts &lt; 3
- Admin publish UI retained

## Rollback

Remove `/studio/publishing` routes and API handlers. Ops nav reverts to link grid.
