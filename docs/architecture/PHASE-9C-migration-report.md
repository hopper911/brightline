# ARCHITECTURE MIGRATION REPORT — PHASE 9C

**Studio Publishing Operations**  
**Date:** 2026-08-28  
**ADR:** [ADR-015-studio-publishing-ops.md](./ADR-015-studio-publishing-ops.md)

---

## 1. Publishing workflows exposed

| Workflow | Studio action | Backend |
| --- | --- | --- |
| Mirotech journal sync (blog) | `POST /api/studio/publishing/sync-blog` | PublishingService or enqueue |
| Hub patch / journal sync jobs | Dashboard + detail view | Existing job handlers |
| Failed job retry | Retry button + API | JobService.runJob |

Not exposed: hub PATCH initiation from Studio (still via admin Studio CMS).

---

## 2. Publishing dashboard

`/studio/publishing` shows:

- Counts: queued, running, completed, failed
- Tenant filter: all permitted / brightline / mirotech
- Recent publishing jobs table with pagination cursor
- Links to legacy admin publishing tools

---

## 3. Job status integration

- `listPlatformPublishingJobs` queries `platform_jobs` where `type` starts with `publishing.`
- Detail page uses sanitized `StudioPublishingJobView`
- No raw provider dashboards required for normal ops

---

## 4. Tenant filtering

- `allowedPublishingTenants()` from memberships + publish permissions
- Job list scoped to permitted tenants
- Cross-tenant job detail blocked when tenant not in allowed set

---

## 5. Permission enforcement

| Action | Permission |
| --- | --- |
| View dashboard | `*.journal.publish` (either tenant) |
| Sync blog | `brightline.journal.publish` |
| Retry job | Publish permission for job tenant |

Unauthorized → 403/404. Legacy admin bypass preserved.

---

## 6. Failure display

Shown: status, attempts, resource ref, target, timestamps, error summary, safe result error.

Hidden: stack traces, secrets, hubPatch body, credentials.

---

## 7. Retry behavior

- Only `FAILED` publishing jobs with attempts &lt; 3
- Uses JobService.runJob (existing idempotent handlers)
- Records audit on retry start/complete/fail
- Authorization checked per job tenant

---

## 8. Existing publish UI retained

`PUBLISHING_OPS_LINKS` still linked from dashboard footer. Admin blog sync, Studio Hub, and delivery tools unchanged.

---

## 9. Tests

| Suite | Focus |
| --- | --- |
| `sanitize-job.test.ts` | Safe job view + retryable flag |
| `publishing-jobs-query.test.ts` | Tenant-scoped listing |
| `access.test.ts` | Publishing permissions |

---

## 10. Recommended Phase 9D

1. Studio-initiated hub patch queue from content detail pages
2. Inline job status polling after async publish
3. Wire publish permissions on admin API routes
4. Merge ops + platform nav into single shell
5. Alert hooks when failed job count spikes (ties to Phase 10 alerting)

---

## Bundled: Phase 9B (if not yet deployed)

Studio content (`/studio/content/*`) and media (`/studio/media/*`) via ContentService and Asset Registry — see [PHASE-9B-migration-report.md](./PHASE-9B-migration-report.md).
