# PHASE 22E — End-to-End Project Publishing

**Status:** Complete  
**Branch:** `architecture/platform-foundation`

---

## 1. Publish workflow

Approved projects publish through `publishApprovedProject()` (`lib/platform/projects/project-publish-service.ts`):

1. `assertProjectPublishAllowed` — completeness + `APPROVED` lifecycle
2. `assertProjectPublishMediaValid` — hero/gallery asset keys
3. Audit `project.publish_requested`
4. **Brightline** `work-project` → `PublishingService` target `brightline-site`
5. **Mirotech** `mirotech-case-study` → hub `dual-brand-work` patch `{ status: PUBLISHED }`
6. Async when `PLATFORM_PUBLISHING_ENABLED` + `PLATFORM_JOBS_ENABLED`; otherwise synchronous
7. Lifecycle stays `APPROVED` until job succeeds; `finalizeProjectPublishSuccess` sets `PUBLISHED`

Studio paths:
- `POST /api/studio/projects/{ref}/transition` with `toLifecycle: PUBLISHED`
- Publishing tab save when toggling published / hub status `PUBLISHED`

---

## 2. Job behavior

| Job type | Tenant | Handler |
|----------|--------|---------|
| `publishing.brightline.work-project.publish` | Brightline | `publishing-brightline-work-project.ts` |
| `publishing.mirotech.hub.patch` | Mirotech | `publishing-mirotech-hub-patch.ts` (with `workflowRef`) |

Statuses: `PENDING` → `RUNNING` → `COMPLETED` | `FAILED`

On success: workflow `PUBLISHED`, published snapshot stored, `project.published` audit  
On failure: workflow remains `APPROVED`, `project.publish_failed` audit

UI polls `jobId` via `pollPlatformJobUntilDone` after transition/save.

---

## 3. Media validation

`validate-publish-media.ts` before enqueue/sync:

- **Brightline:** hero media id + resolvable `keyFull`/`keyThumb`; gallery items must have keys
- **Mirotech:** non-empty `heroImage` key

Publish fails safely with validation error — no partial domain publish.

---

## 4. Public output

- **Brightline:** `BrightlinePublishingAdapter` sets `work_projects.published=true`, `publishedAt`, revalidates `/work/{pillar}/{slug}`, `/work`, sitemap
- **Mirotech:** existing `MirotechPublishingAdapter` hub project write
- No duplicate content tables — live reads use existing Prisma/hub sources

---

## 5. Deployment / revalidation

Uses **Next.js `revalidatePath`** + `revalidatePublicChrome()` (tag-based chrome cache). No separate Vercel deploy hook — path revalidation is the documented mechanism for work project publish.

---

## 6. Success definition

Publish is **completed** only when:

1. Domain write succeeds (`published=true` or hub `PUBLISHED`)
2. Post-write verification confirms published flag
3. Cache revalidation runs (Brightline)
4. Workflow finalized to `PUBLISHED` + `project.published` audit

Job `COMPLETED` without workflow finalize does not occur — handlers call finalize before storing job result.

---

## 7. Published version strategy

**Snapshot at publish time** stored in `SiteSetting` (`project_published_snapshot:v1:*`): title, slug, publicPath, publishedAt, heroKey, summary.

**Major workflow flag:** Brightline `work_projects` edits after publish immediately affect the live public page — there is no separate draft fork. Operators should treat post-publish edits as live changes until a future draft/publish split is implemented.

---

## 8. Failure behavior

| Scenario | Lifecycle | Audit |
|----------|-----------|-------|
| Unapproved / incomplete | unchanged | none (gate rejects) |
| Missing media | unchanged | none |
| Job / adapter failure | `APPROVED` | `project.publish_failed` |
| Success | `PUBLISHED` | `project.published` |

---

## 9. Audit

| Action | When |
|--------|------|
| `project.publish_requested` | Publish initiated |
| `project.published` | Successful finalize |
| `project.publish_failed` | Failed job or sync publish |

Plus existing `publishing.queued`, `publishing.started`, `publishing.completed`, `publishing.failed`.

---

## 10. Tests

- `project-publish-service.test.ts` — gate, sync publish, async enqueue
- `brightline-publishing-adapter.test.ts` — adapter publish + revalidation
- Existing workflow/transition tests remain green

---

## 11. Recommended Phase 23A

From 22D/22E backlog:

1. **Partner notifications** — Slack/email on `project.review_requested` / `project.published`
2. **Reviewer queue dashboard** — `/studio/projects` IN_REVIEW/APPROVED counts + assignee
3. **Playwright E2E** — draft → review → approve → publish with permission matrix + job poll
4. **Draft fork** — separate draft from live work project to address immediate-live-edit risk
5. **Brightline `publishedAt` reporting** — ops dashboard for publish history from snapshots

---

## Key files

| Area | Path |
|------|------|
| Publish orchestration | `lib/platform/projects/project-publish-service.ts` |
| Brightline adapter | `lib/platform/publishing/adapters/brightline-publishing-adapter.ts` |
| Brightline job | `lib/platform/jobs/handlers/publishing-brightline-work-project.ts` |
| Finalize | `lib/platform/projects/finalize-project-publish.ts` |
| Media gate | `lib/platform/projects/validate-publish-media.ts` |
| Snapshot | `lib/platform/projects/published-snapshot.ts` |
