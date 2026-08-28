# ADR-008: Platform Background Jobs

**Status:** Accepted  
**Date:** 2026-08-28  
**Depends on:** [ADR-007](./ADR-007-publishing-service.md), [ADR-002](./ADR-002-tenant-context.md), [ADR-003](./ADR-003-audit-events.md), [ADR-001](./ADR-001-platform-foundation.md)  
**Inventory:** [jobs-current-state.md](./jobs-current-state.md)

## Context

Brightline operates on **Vercel Hobby** with **Neon Postgres**, **R2**, and existing **Vercel Cron** (`/api/cron/followups`). There is **no** Inngest, Trigger.dev, Kafka, or RabbitMQ in the repo.

Future work needs durable background execution for:

- Publishing (Mirotech journal/hub sync, cache revalidation batches)
- Image / video processing
- Notifications and follow-ups (beyond single cron route)
- AI metadata enrichment
- Document generation
- Content synchronization

Phase 7A introduces **job infrastructure only**. Existing synchronous publish, media, and email paths **must not change**.

## Provider decision

### Evaluated options

| Option | Fit | Why not (yet) |
| --- | --- | --- |
| **Reuse Vercel Cron only** | Partial | Cron exists but there is no job record model or status API |
| **Inngest / Trigger.dev** | Good DX | New external dependency, cost, and env wiring; premature before contract is stable |
| **Upstash Queue** | Possible | Redis already used for rate limits only; adds queue semantics + billing without Phase 7A need |
| **Postgres + cron drain** | Strong Phase 7B | Requires migration; deferred to keep 7A diff small |
| **In-memory JobProvider** | **Chosen for 7A** | Zero new infra; validates contract in tests; no production behavior change |

### Decision

1. **Phase 7A:** `MemoryJobProvider` behind `PLATFORM_JOBS_ENABLED` (default **off**).
2. **Phase 7B:** `PostgresJobProvider` (Prisma table) + optional `/api/cron/platform-jobs` drain using existing `CRON_SECRET` pattern.
3. **Do not** introduce Kafka, RabbitMQ, or Kubernetes.

Rationale: matches prior platform phases (contract first, flag-gated, no consumer migration). Vercel Hobby budget favors **direct DB/R2 scripts** over streaming bytes through serverless for bulk work; jobs orchestrate **references**, not secrets or large blobs.

## Architecture

```
Caller (future admin route / cron / test)
        │
        ▼
JobService.enqueue / getStatus / runJob
        │
        ├── payload-security (reject secrets)
        ├── tenant guard (PlatformContext)
        ├── recordAuditSafely (job.created | completed | failed)
        ▼
JobProvider (Memory → Postgres in 7B)
        │
        ▼
JobHandlerRegistry → handler per job type
```

## Job model

```typescript
type JobRecord = {
  id: string;
  tenantSlug: TenantSlug;
  type: string;              // e.g. platform.health.test
  status: JobStatus;
  payload: JobPayload;     // stable IDs only
  attempts: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  errorSummary: string | null;
};
```

**Statuses:** `PENDING` | `RUNNING` | `COMPLETED` | `FAILED`  
**No `CANCELLED`** in 7A — no product requirement yet.

## JobService contract

```typescript
interface JobService {
  enqueue(context, input): Promise<{ jobId: string }>;
  getStatus(context, jobId): Promise<JobRecord | null>;
  runJob(context, jobId): Promise<JobRecord>;  // tests + future cron drain
}
```

No universal orchestration, retry scheduler, or distributed lock in 7A.

## Tenant propagation

- Every job stores `tenantSlug` from `PlatformContext` at enqueue time.
- `getStatus` and `runJob` reject cross-tenant access (`JobForbiddenError`).
- Handlers receive `PlatformContext` reconstructed via `createPlatformContextForTenant(job.tenantSlug)`.
- Payloads carry **resource refs** (`blog-post` id, `work-project` id) — not tenant secrets.

## Payload security

**Forbidden in payloads:**

- Passwords, session tokens, API keys, R2 credentials
- Long-lived signed URLs
- Arbitrary nested blobs beyond depth/key limits

Validation runs at `enqueue` via `assertSafeJobPayload`. Handlers must still load credentials from server env at execution time.

## Idempotency

Jobs are designed for **at-least-once** execution:

- Provider may redeliver after timeout or crash
- Handlers should use stable resource IDs and idempotent side effects where possible (same pattern as Stripe webhooks)
- **No** universal distributed lock in 7A

Document in handler comments when an operation is safe to repeat.

## Failure / retry philosophy

- `runJob` increments `attempts` on each execution
- Failed jobs remain `FAILED` with `errorSummary` (truncated)
- Re-run allowed from `FAILED` → `RUNNING` (manual or future cron policy)
- No automatic exponential backoff in 7A

## Audit events

When `PLATFORM_AUDIT_ENABLED`:

| Action | When |
| --- | --- |
| `job.created` | After successful enqueue |
| `job.completed` | Handler succeeds |
| `job.failed` | Handler throws |

Uses `recordAuditSafely` — job failure must not break unrelated flows.

## Test job

`platform.health.test`:

- Registered handler performs **no** DB, R2, or HTTP writes
- Invoked from Vitest only in 7A — **no public HTTP trigger**
- Validates enqueue → run → `COMPLETED` pipeline

## Feature flag

| Env | Default | Effect |
| --- | --- | --- |
| `PLATFORM_JOBS_ENABLED` | off | When off, `JobService` throws `JobsDisabledError` |

No existing route checks this flag in 7A.

## Phase 7B — first async publishing workflow (implemented)

**Workflow:** Blog PATCH Mirotech journal sync (`resolveBlogPostsMirotechSync`) — same consumer as Phase 6C.

**Job type:** `publishing.mirotech.journal.sync`

**Flags (both required for async path):** `PLATFORM_JOBS_ENABLED` + `PLATFORM_PUBLISHING_ENABLED`

**Transition adapter:** Enqueues durable Postgres jobs, then **drains inline** in the same admin PATCH request so `{ posts, mirotechSync }` response shape is unchanged. Future cron drain can replace inline `runJob` without UI changes.

**Idempotency key:** `{jobType}:{tenant}:{contentType}:{id}:{target}:{operation}:{contentVersion}` — reuses COMPLETED jobs; FAILED jobs retry via same key.

**Max attempts:** 3 per publishing job.

## Future (Phase 7C+)

1. Cron drain route `/api/cron/platform-jobs` (guarded like followups cron) — replace inline drain
2. Optional admin poll UI when response returns `accepted` only
3. Next job types: `publishing.mirotech.hub.patch` (Studio Hub)

See [ADR-007](./ADR-007-publishing-service.md) — `accepted` outcome still available for true fire-and-forget responses later.

## Consequences

**Positive**

- Typed boundary before adopting external queue SaaS
- Tenant + payload rules enforced early
- Audit hooks aligned with platform audit ADR

**Negative**

- Inline worker drain in admin PATCH preserves UI but is not yet fully fire-and-forget
- Cron drain route deferred to Phase 7C

## Validation

- Vitest: types, payload security, DefaultJobService with flag on/off
- `npm run lint`, `typecheck`, `test`, `build` — no production runtime change
