# PHASE 22D — Project Review + Approval Workflow

**Status:** Complete  
**Branch:** `architecture/platform-foundation`  
**Scope:** Governed lifecycle transitions for Brightline work projects and Mirotech case studies in Studio.

---

## 1. Lifecycle transitions

Explicit workflow states are stored per project in `SiteSetting` (`project_workflow_state:v1:*`) while pre-review progress still derives from content completeness.

**Legal transitions** (`lib/platform/projects/lifecycle-transitions.ts`):

| From | To |
|------|-----|
| DRAFT | CONTENT_READY, MEDIA_READY, IN_REVIEW |
| CONTENT_READY | DRAFT, MEDIA_READY, IN_REVIEW |
| MEDIA_READY | CONTENT_READY, IN_REVIEW |
| IN_REVIEW | MEDIA_READY, APPROVED |
| APPROVED | IN_REVIEW, PUBLISHED |
| PUBLISHED | APPROVED, ARCHIVED |
| ARCHIVED | DRAFT |

Backward moves are limited to useful editor flows (return to editing, reopen review) without opening arbitrary jumps (e.g. DRAFT → PUBLISHED).

`DefaultProjectWorkflowService.transitionLifecycle()` enforces rules, persists state, applies domain patches where needed, and returns allowed next transitions.

**API:** `POST /api/studio/projects/{projectRef}/transition` with `{ toLifecycle, reviewNotes? }`.

---

## 2. Completeness gate

Projects cannot enter `IN_REVIEW` unless `evaluateCompleteness()` reports `complete: true`.

On failure, `ProjectWorkflowTransitionError` returns structured `missing` requirements (same list as completeness validators).

Publishing via transition to `PUBLISHED` also requires completeness plus prior `APPROVED` state.

---

## 3. Approval flow

New permissions:

- `brightline.project.approve` — Brightline ADMIN / OWNER
- `mirotech.project.approve` — Mirotech ADMIN / OWNER (via `MT_APPROVE` chain)

| Action | Permission |
|--------|------------|
| Request review (`IN_REVIEW`) | `*.project.write` |
| Approve (`APPROVED`) | `*.project.approve` |
| Publish (`PUBLISHED`) | `*.project.approve` |

Legacy admin bypass remains for operator sessions without platform identity.

---

## 4. Review notes

Short internal `reviewNotes` stored in workflow state (not a comment thread). Editable from Studio Overview and sent with transition requests.

---

## 5. Publishing gate

Server-side enforcement (not UI-only):

- `assertProjectPublishAllowed()` — requires `APPROVED` (or already published) + completeness
- `save-studio-project-section` publishing section
- `resolveStudioHubProjectPatch` when `status=PUBLISHED`
- `DefaultPublishingService.publish` for hub project sync to `PUBLISHED`

Studio Publishing tab disables publish controls unless `workflow.publishAllowed` is true.

---

## 6. Audit

| Action | When |
|--------|------|
| `project.review_requested` | Transition to `IN_REVIEW` |
| `project.approved` | Transition to `APPROVED` |
| `project.review_reopened` | `APPROVED` → `IN_REVIEW` |
| `project.status.changed` | Other governed transitions |

Actor is platform user or legacy admin where available.

---

## 7. Tests

- `lib/platform/projects/lifecycle-transitions.test.ts` — transition matrix + effective lifecycle
- `lib/platform/projects/project-workflow-transition.test.ts` — incomplete review, valid review, approval permission, publish without approval, reopen review

---

## 8. Recommended Phase 22E

1. **Async transition jobs** — large Mirotech hub publishes via existing publishing job queue with transition status polling.
2. **Partner notifications** — email/Slack when review is requested or approved (Mirotech ↔ Brightline handoff).
3. **Dashboard filters** — surface `IN_REVIEW` / `APPROVED` counts on `/studio/projects` with reviewer queue view.
4. **Brightline domain sync** — optional Prisma field or published-at timestamp aligned with workflow `PUBLISHED` for reporting.
5. **E2E** — Playwright path: draft → complete → review → approve → publish with permission matrix.

---

## Key files

| Area | Path |
|------|------|
| Transition rules | `lib/platform/projects/lifecycle-transitions.ts` |
| Workflow persistence | `lib/platform/projects/workflow-state.ts` |
| Transition service | `lib/platform/projects/default-project-workflow-service.ts` |
| Publish gate | `lib/platform/projects/publish-gate.ts` |
| Studio API | `app/api/studio/projects/[projectRef]/transition/route.ts` |
| Studio UI | `components/studio/StudioProjectEditor.tsx` |
