# PROJECT COMPLETION REPORT — PHASE 22B

**Studio project dashboard + creation**  
**Date:** 2026-08-29  
**Branch:** `architecture/platform-foundation`

---

## 1. Project dashboard

**Route:** `/studio/projects`

Operational project list for workflow ingestion (not Studio CRM `StudioProject`).

| Column | Source |
|--------|--------|
| Title / slug | Domain record |
| Tenant | `brightline` or `mirotech` |
| Type | Work section or “Case study” |
| Status | `ProjectWorkflowService.deriveLifecycle()` |
| Completeness | Validator score (0–100) + missing checklist |
| Updated | `updatedAt` |
| Publish | `published` / hub `status` |

**Listing service:** `lib/studio/projects/list-studio-projects.ts`  
- Brightline: Prisma `WorkProject` (all drafts + published)  
- MiroTech: `listHubProjects()` hub API  
- Enrichment via `defaultProjectWorkflowService` — no ad-hoc completeness logic in UI

**Nav:** Added “Projects” to `STUDIO_PLATFORM_NAV` under Studio control plane shell.

---

## 2. Creation workflow

**UX:** Create project → minimal modal (tenant, title, optional template) → `POST /api/studio/projects` → redirect to admin editor.

| Tenant | Editor redirect |
|--------|-----------------|
| Brightline | `/admin/work/{id}` |
| MiroTech | `/admin/studio-cms/{id}` |

**API:** `POST /api/studio/projects` delegates to `defaultProjectWorkflowService.create()` — no Prisma writes in route handlers or React components.

**Templates:** `GET /api/studio/projects/templates?tenant=&kind=` returns `listProjectWorkflowTemplates()`.

**Errors:** 409 slug conflict (`ProjectSlugConflictError`), 403 permission, 400 validation.

---

## 3. Tenant filters

- **All authorized** — when operator has both tenants  
- **Brightline** / **MiroTech** — membership + read permission gated  
- Server: `allowedProjectTenants()` in `lib/studio/access.ts`  
- UI: query param `?tenant=all|brightline|mirotech`

Read permissions:
- Brightline: `brightline.journal.read` | `brightline.project.create` | `brightline.project.write`
- MiroTech: `mirotech.project.read` | `mirotech.project.write`

---

## 4. Lifecycle representation

Normalized lifecycle from Phase 22A mappers:

`DRAFT` → `CONTENT_READY` → `MEDIA_READY` → `IN_REVIEW` → `APPROVED` → `PUBLISHED` (+ `ARCHIVED` hidden from default “all” filter)

**Dashboard status filters** map to lifecycle buckets:

| Filter | Lifecycle match |
|--------|-------------------|
| Draft | `DRAFT` |
| Needs content | `DRAFT` |
| Needs media | `CONTENT_READY` |
| Review | `IN_REVIEW` |
| Approved | `APPROVED` |
| Published | `PUBLISHED` |

Status changes are **not** editable from the dashboard in 22B — workflow rules remain in editors + `recordStatusChange` for future use.

---

## 5. Completeness display

- **Score:** validator-defined ratio (`passed checks / total checks × 100`) — not arbitrary  
- **Missing list:** up to 3 labels in table + overflow count  
- **Complete:** shows “Ready” when `missing.length === 0`

Same validators as Phase 22A: `validateBrightlineProjectCompleteness`, `validateMirotechProjectCompleteness`.

---

## 6. Permissions

| Action | Permission | UI behavior |
|--------|------------|-------------|
| View Brightline projects | journal.read / project.create / project.write | List + filters |
| View MiroTech projects | project.read / project.write | List + filters |
| Create Brightline | `brightline.project.create` | “Create project” button |
| Create MiroTech | `mirotech.project.write` | “Create project” button |
| Legacy admin | bypass | Full access |

Server-side checks on all API routes; create button hidden when `canCreate*` is false.

---

## 7. Tests

| File | Coverage |
|------|----------|
| `lib/studio/projects/status-filters.test.ts` | Filter buckets, empty messages, labels |
| `lib/studio/projects/list-studio-projects.test.ts` | Tenant filter, status filter, pagination, permissions |
| `app/api/studio/projects/route.test.ts` | Create via service, slug conflict, validation |
| `lib/studio/access.test.ts` | Project create/read permission helpers |

**21 new tests** in Phase 22B files; full suite remains green.

---

## 8. Remaining editor requirements

Not in scope for 22B (existing admin surfaces):

- Full body copy, media upload, SEO fields, publish toggle  
- Brightline: `/admin/work/[id]`  
- MiroTech: `/admin/studio-cms/[id]`  
- Publish still via existing admin/publishing paths until gated in 22C  
- No in-dashboard status transition UI  
- Mirotech list loads full hub project set (no server-side hub pagination yet)

---

## 9. Recommended Phase 22C

1. **Publish gate** — disable publish in admin until `completeness.complete`; wire `PublishingService` when flag-gated  
2. **Status workflow UI** — allowed transitions only; `recordStatusChange` + hub/Prisma updates  
3. **Project detail in Studio** — `/studio/projects/[id]` completeness panel without opening admin  
4. **Hub pagination** — if Mirotech project volume grows  
5. **Search** — title/slug filter on dashboard  
6. **Migrate legacy POST** `/api/admin/work-projects` create to workflow service or deprecate

---

## Files added / changed (summary)

```
app/studio/projects/layout.tsx
app/studio/projects/page.tsx
app/api/studio/projects/route.ts
app/api/studio/projects/templates/route.ts
components/studio/StudioProjectsTable.tsx
components/studio/StudioProjectCreateForm.tsx
lib/studio/projects/* (types, list, filters, edit-href, resolve-subject)
lib/studio/access.ts (project permissions)
lib/studio/platform-nav.ts
```

**STOP** — Phase 22B complete.
