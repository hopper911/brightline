# PHASE 25 — Project Completion Report

**Project:** Brightline Photography ↔ MiroTech Solutions  
**Phase:** 25 — Project completion queue  
**Date:** 2026-08-29

---

## 1. Queue implemented

**Route:** `/studio/projects/completion`  
**Nav:** Studio platform nav → **Completion queue**

Seven dashboard sections (projects can appear in multiple sections when they have multiple blocker types):

| Section ID | Label |
| --- | --- |
| `needs-content` | Needs content |
| `needs-media` | Needs media |
| `needs-seo` | Needs SEO |
| `ready-for-review` | Ready for review |
| `approved-waiting-publish` | Approved / waiting publish |
| `publish-failed` | Publish failed |
| `published-needs-verification` | Published / needs verification |

**Modules:**

- `lib/studio/projects/completion-queue.ts` — server aggregation
- `lib/studio/projects/completion-blockers.ts` — blocker categorization + friendly labels
- `components/studio/StudioCompletionQueue.tsx` — UI
- `app/studio/projects/completion/page.tsx` — page shell

---

## 2. Blocker categories

Completeness `missing[]` from `ProjectWorkflowService` validators is split into:

| Category | Examples |
| --- | --- |
| **Content** | summary, body, sections, challenge/outcome, template sections |
| **Media** | hero asset, Open Graph image |
| **SEO** | SEO title, meta description |

Friendly labels (e.g. `hero asset` → “final hero image”) shown in queue cards.

Workflow-driven sections:

- **Ready for review** — `MEDIA_READY` or `CONTENT_READY`, complete, not yet in review/approved
- **Approved / waiting publish** — `APPROVED`, not live, no publish failure
- **Publish failed** — `publishFailedAt` on workflow state (set in `finalizeProjectPublishFailure`)
- **Published / needs verification** — live but completeness gaps remain

---

## 3. Priority

Simple operator priority on workflow state (`SiteSetting`):

- `HIGH` | `NORMAL` | `LOW` (default `NORMAL`)
- Editable per card in completion queue UI
- API: `POST /api/studio/projects/completion-queue/priority` with `{ projectRef, priority }`
- Queue sorts each section: HIGH first, then by `updatedAt`

No task management, assignments, or due dates.

---

## 4. Quick actions

Per project, gated by permissions and workflow state:

| Action | When shown |
| --- | --- |
| **Continue editing** | `canWrite` |
| **Open media** | `canWrite` → editor `?tab=media` |
| **Preview** | preview URL exists |
| **Submit review** | can transition to `IN_REVIEW` → `?workflow=review` |
| **Publish** | approved + publish gate passes → `?workflow=publish` |

Editor honors `tab` and `workflow` query params for deep links from the queue.

---

## 5. Tenant handling

Filter pills: **All** · **Brightline** · **MiroTech** (when operator has both tenants).

Uses same membership/RBAC as `/studio/projects`. Archived projects excluded from queue.

---

## 6. Tests

| File | Coverage |
| --- | --- |
| `lib/studio/projects/completion-blockers.test.ts` | Category mapping, friendly labels |

Full vitest suite must remain green.

---

## Publish failure tracking (25 addition)

`StoredProjectWorkflowState` extended with `publishFailedAt`, `publishFailedReason`, `priority`.  
`finalizeProjectPublishFailure` stamps failure on workflow state while lifecycle stays `APPROVED`.  
`finalizeProjectPublishSuccess` clears failure flags.

---

## Out of scope

- Custom blocker notes per project
- Bulk priority or bulk publish from queue
- Client portal / marketing site analytics verification
- Automated priority scoring
