# Background jobs — current state (Phase 7A inventory)

**Date:** 2026-08-28  
**Scope:** Brightline Photography ↔ MiroTech Solutions monorepo (`brightline/`)

## Summary

There is **no dedicated job queue or workflow engine** in production today. Async work is handled through **Vercel Cron**, **synchronous API handlers**, **Stripe webhooks**, **local CLI scripts**, and **UI debouncing** — not through a unified job abstraction.

Phase 7A introduces **`lib/platform/jobs/`** as contract + in-process provider only. **No existing behavior moves into jobs yet.**

---

## Scheduled / cron

| Mechanism | Location | Schedule | Guard |
| --- | --- | --- | --- |
| Vercel Cron | `vercel.json` → `/api/cron/followups` | Daily 14:00 UTC | `CRON_SECRET` bearer via `guardCronBearer` |
| Handler | `app/api/cron/followups/route.ts` | — | Calls `sendDueFollowUps()` synchronously in the cron invocation |

**Notes:** Single cron route. No generic job drain route exists yet.

---

## External queue / workflow SaaS

| System | Present? | Usage |
| --- | --- | --- |
| Inngest | No | — |
| Trigger.dev | No | — |
| Vercel Queues / Workflows | No | — |
| Kafka / RabbitMQ | No | — |

---

## Upstash Redis

| Usage | Location |
| --- | --- |
| **Rate limiting only** | `lib/permissions/rate-limit.ts` |

Upstash is **not** used as a job queue or durable work backlog.

---

## Webhooks (event-driven, not job queue)

| Source | Route / store | Pattern |
| --- | --- | --- |
| Stripe | `app/api/stripe/webhook/route.ts` | Verify signature; idempotent invoice/payment updates |
| Studio automation | `app/api/studio/automation/events` | Persists `StudioWebhookLog`; synchronous handling |
| Google Sheet image pipeline | Apps Script → Brightline webhook | External trigger; not platform jobs |

Webhooks are **request-scoped handlers**, not retried background jobs with status polling.

---

## Fire-and-forget / deferred work

| Pattern | Examples | Job-like? |
| --- | --- | --- |
| `setTimeout` in UI | Admin debounce, copy-toast timers | No — client only |
| `void promise.catch()` | Upload progress, refresh after save | No — best-effort in-request side effects |
| `Promise.all` in API routes | Blog Mirotech sync batch | Sync — completes before HTTP response |

No production path enqueues durable work and returns immediately with a `jobId`.

---

## Publishing & media (still synchronous)

Documented in [publishing-current-state.md](./publishing-current-state.md):

- Admin PATCH handlers persist then publish/sync in the same request
- `PublishResult.outcome: "accepted"` reserved for Phase 7B async handoff
- R2 bulk scripts run locally or via admin API (Vercel transfer budget concern)

---

## Local / operator scripts

| Examples | Execution |
| --- | --- |
| `scripts/resync-mirotech-journal.ts` | Local `tsx` |
| `scripts/execute-mirotech-r2-reorg.ts` | Local direct R2 |
| Asset backfill CLIs | Local with production env |

Scripts are **operator-initiated**, not platform job records.

---

## Platform audit (related, not jobs)

`platform_audit_events` (Prisma) stores operational audit rows. Phase 2A explicitly has **no retry queue** for audit writes. Job audit events (`job.created`, etc.) reuse `recordAuditSafely` when `PLATFORM_AUDIT_ENABLED` is on.

---

## Gaps Phase 7A addresses

1. Typed **Job** model and **JobService** (`enqueue`, `getStatus`, `runJob` for tests/future drain)
2. **Tenant-aware** payloads (reconstruct `PlatformContext` from `tenantSlug` + stable refs)
3. **Payload security** validation (no secrets in payloads)
4. **Feature flag** `PLATFORM_JOBS_ENABLED` (default off)
5. **Test job** `platform.health.test` — no production mutation
6. ADR-008 documenting provider choice and Phase 7B migration path

## Phase 7B candidates (not in 7A)

- Postgres-backed `JobProvider` + `/api/cron/platform-jobs` drain
- Publishing `accepted` + poll `getStatus`
- Mirotech journal/hub sync as first real job type
