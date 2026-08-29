# PROJECT COMPLETION REPORT — PHASE 22C

**Studio project editor**  
**Date:** 2026-08-29  
**Branch:** `architecture/platform-foundation`

---

## 1. Editor structure

**Route:** `/studio/projects/{encodedContentRef}`  
Example: `/studio/projects/brightline%3Awork-project%3A{id}`

**Shell:** `StudioProjectEditor` with tabs:

| Tab | Purpose |
|-----|---------|
| Overview | Title, slug, summary, lifecycle, updated |
| Content | Domain-specific copy (see §3–4) |
| Media | Hero + gallery order (BL) or hub image keys (MT) |
| Details | Taxonomy / metadata |
| SEO | Meta title, description, slug preview |
| Publishing | Completeness gate + publish controls |
| Activity | Major audit events for this project |

**Data loading:** `getStudioProjectEditorView()` — Prisma (Brightline) or hub API (MiroTech), enriched via `ProjectWorkflowService` completeness/lifecycle.

**Save:** Explicit **Save section** per tab (no autosave). States: idle · dirty · saving · saved · error.

**APIs:**

- `GET/PATCH /api/studio/projects/[projectRef]`
- `PATCH /api/studio/projects/[projectRef]/media`
- `GET /api/studio/projects/[projectRef]/activity`
- `GET /api/studio/assets?tenant=` (tenant-scoped registry picker)

Dashboard **Continue editing** now routes to Studio editor (`edit-href.ts` updated).

---

## 2. Brightline fields

**Overview:** title, slug, summary  
**Content:** description, editorial blocks (opening, context, approach, execution, closing), extended overview fields  
**Details:** pillar/section, location, year, client, projectType, scope, featured, sortOrder  
**SEO:** seoTitle, metaDescription (saved via section validator)  
**Publishing:** `published` boolean — disabled until completeness validator passes  
**Media:** `heroMediaId`, explicit `ProjectMedia.sortOrder`

---

## 3. MiroTech fields

**Overview:** title, slug, summary, hub `status`  
**Content:** challenge, outcome, role, duration, structured `sections[]` (JSON editor)  
**Details:** year, status, projectType, clientType, categories, disciplines, tools, platforms  
**SEO:** seoTitle, seoDescription  
**Publishing:** hub status, `publishMirotech`, `publishBrightline` — PUBLISHED blocked until complete  
**Media:** heroImage, thumbnailImage, backgroundMedia keys via hub patch

---

## 4. Content sections

MiroTech flexible sections supported via JSON array on Content tab (types align with hub: text, image, quote, gallery, video, metrics, etc.).

Brightline uses fixed editorial + description fields matching portfolio case study requirements — not a single merged form.

---

## 5. Save strategy

- **No autosave** — matches existing admin editors  
- Section-scoped PATCH with server validation (`validateStudioProjectSectionSave`)  
- Mirotech saves may return async `jobId` → `pollPlatformJobUntilDone`  
- Publish gate enforced server-side (`completenessComplete` required)

---

## 6. Media workflow

- Brightline: explicit gallery ordering (↑/↓), set hero, `PATCH .../media`  
- MiroTech: image key fields → `resolveStudioHubProjectPatch`  
- Asset registry browse link (`/studio/media?tenant=`) + `GET /api/studio/assets` with **tenant filter**  
- Work gallery still uses Prisma `ProjectMedia` (registry partial coverage documented)

---

## 7. SEO

- Meta title / description with soft length hints (60 / 160) — not hard limits  
- Slug preview on SEO tab  
- Server max-length guards on save

---

## 8. Publishing status

Publishing tab shows completeness %, missing requirements, publish toggles/status.  
Links to `/studio/publishing` for job history.  
Mirotech uses PublishingService path when platform publishing enabled.

---

## 9. Activity

- `GET .../activity` filters audit by `resourceType` + **`resourceId`** (repository extended)  
- Major events only: `project.*`, `publishing.*`, `asset.registered`  
- Not raw log dump

---

## 10. Preview

- Brightline: `/admin/work/preview/{id}` (auth-gated)  
- MiroTech: `/admin/studio-cms/{id}/preview`  
- No new public draft URLs

---

## 11. Tests

| File | Coverage |
|------|----------|
| `project-ref.test.ts` | URL encode/decode, audit resource mapping |
| `validate-studio-project-section.test.ts` | Validation, publish gate, SEO hints |
| Existing 22B tests updated for Studio edit href |
| **560 total tests** green |

---

## 12. Recommended Phase 22D

1. **Rich section editor** — replace Mirotech JSON with `HubCaseStudySectionsEditor` embed  
2. **In-editor asset picker** — modal using `/api/studio/assets` + upload via MediaService  
3. **Status workflow UI** — allowed transitions + `recordStatusChange` + domain writes  
4. **Brightline publish** — PublishingService adapter (parity with Mirotech)  
5. **Hub list pagination** — dashboard + editor scale  
6. **Search** on projects dashboard  
7. **Deprecate** legacy `/admin/work/[id]` monolith once parity confirmed

---

**STOP** — Phase 22C complete.
