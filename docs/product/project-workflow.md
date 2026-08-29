# Project ingestion workflow

**Phase 22A** — controlled create → validate → publish path for Brightline photography work and Mirotech case studies.

This is **not** a generic CMS. It coordinates **lifecycle, completeness, and creation** on top of existing domain models and platform services.

---

## Operational flow

```
CREATE PROJECT → ENTER CONTENT → ATTACH MEDIA → VALIDATE COMPLETENESS
      → REVIEW → APPROVE → PUBLISH → VERIFY LIVE OUTPUT
```

Phase 22A implements the **foundation** (create draft, completeness, slug rules, RBAC, audit). Studio UI and publish gates are Phase 22B.

---

## Domain models (inventory)

### Brightline (`brightlinephotography.com`)

| Model | Role | Public route | Status |
| --- | --- | --- | --- |
| **WorkProject** | Primary photography portfolio / case studies | `/work/[pillar]/[slug]` | `published` boolean |
| **PortfolioProject** | Legacy portfolio grid | `/portfolio/...` | `published` boolean |
| **Project** | Client portal project (galleries) | Client-facing, not marketing work | `published` boolean |
| **StudioProject** | Studio OS CMS record | Linked to work via `studioProjectId` | `published`, `contentStatus` |
| **DesignProject** | Design portfolio | `/design/...` | `DesignPortfolioStatus` enum |
| **Gallery** | Client delivery | `/client`, gallery codes | `GalleryStatus` |

**22A focus:** `WorkProject` (`kind: work-project`).

### Mirotech (`mirotech.solutions`)

| Model | Role | Public route | Status |
| --- | --- | --- | --- |
| **CaseStudy** | Case studies / work | `/work/[slug]` | `ContentStatus`: DRAFT, REVIEW, PUBLISHED, ARCHIVED |
| **CaseStudySection** | Structured body blocks | — | — |
| **ProjectAsset** | Media attachments | — | — |

Created from Brightline via `POST /api/content/v1/projects` (hub API). **22A focus:** `mirotech-case-study` workflow kind.

### Duplicated concepts

- **Three “project” tables on Brightline** — `WorkProject` (marketing), `Project` (client portal), `StudioProject` (ops CMS). Do not merge; workflow targets marketing surfaces.
- **Mirotech CaseStudy vs Brightline WorkProject** — linked optionally via `brightlineExternalId` / hub sync, not shared FK.

---

## Shared lifecycle (platform abstraction)

Normalized states in `lib/platform/projects/types.ts`:

`DRAFT` → `CONTENT_READY` → `MEDIA_READY` → `IN_REVIEW` → `APPROVED` → `PUBLISHED` → `ARCHIVED`

**Not a single Prisma enum.** Mapped from domain fields in `lib/platform/projects/lifecycle.ts`:

| Platform state | Brightline WorkProject | Mirotech CaseStudy |
| --- | --- | --- |
| PUBLISHED | `published === true` | `status === PUBLISHED` |
| ARCHIVED | — (no field yet) | `status === ARCHIVED` |
| IN_REVIEW | — | `status === REVIEW` |
| APPROVED | complete for publish, not published | complete for publish, `DRAFT` |
| MEDIA_READY | body + hero/media partial | summary + hero partial |
| CONTENT_READY | summary/body without hero | summary without hero |
| DRAFT | default new draft | `status === DRAFT` |

ContentService `lifecycle` (`draft` / `published` / `archived`) remains the **public read** abstraction; workflow lifecycle is for **operator ingestion**.

---

## Completeness model

`ProjectCompletenessResult`:

```json
{
  "complete": false,
  "score": 72,
  "missing": ["hero asset", "SEO description"],
  "warnings": []
}
```

- **Score** = passed checks ÷ total checks × 100 (transparent, not AI).
- Validators: `validateBrightlineProjectCompleteness`, `validateMirotechProjectCompleteness`.

### Brightline WorkProject requirements

| Check | Required for publish |
| --- | --- |
| Title, slug, work section | Yes |
| Summary | Yes |
| Hero or gallery media | Yes |
| Body (description or summary) | Yes |
| SEO title, meta description, OG (hero key) | Yes |

### Mirotech CaseStudy requirements

| Check | Required for publish |
| --- | --- |
| Title, slug, summary | Yes |
| Hero or thumbnail | Yes |
| Sections or challenge/outcome narrative | Yes |
| Outcome or challenge field | Yes |
| Publish Mirotech flag | Yes |
| SEO title, description, OG asset | Yes |

---

## Templates

Starter defaults in `lib/platform/projects/templates.ts` (5 per tenant):

**Brightline:** commercial-architecture, hospitality, editorial, event, headshot (pillar defaults).

**Mirotech:** ai-saas-platform, ai-automation-agent-workflow, data-intelligence-platform, fintech-compliance-platform, operational-workflow-saas (`projectType` + categories + section shells).

Templates seed **structure** (sections, field labels, media slots, SEO hints) — not fabricated claims. Legacy ids `ai-saas-case-study`, `automation-platform`, and `data-platform` map to Phase 23A equivalents.

---

## ProjectWorkflowService

Module: `lib/platform/projects/`

```ts
defaultProjectWorkflowService.create(context, subject, {
  tenant: "brightline",
  kind: "work-project",
  title: "Glass Tower",
  pillarSlug: "acd",
  templateId: "commercial-architecture", // optional
});
```

- **Does not replace ContentService** — returns `ContentRef` for downstream reads/publishing.
- **Brightline create** — Prisma `WorkProject` draft (`published: false`, no hero required).
- **Mirotech create** — Hub `POST /api/content/v1/projects` via `mirotechCreateHubProject`.
- **Audit** — `project.created`, `project.status.changed` (no per-keystroke audit).

---

## Slug behavior

- Normalization: `lib/slugify.ts` / `normalizeProjectSlugInput` (aligned with admin work routes).
- **Brightline:** unique per `(section, slug)` — default policy **reject** on conflict (`ProjectSlugConflictError`).
- **Mirotech:** default policy **suffix** (`slug-{base36}`) when taken, matching Content API convention.
- **Stable internal ID:** always `WorkProject.id` or `CaseStudy.id` — slug is routing only.

---

## SEO validation

Completeness includes SEO fields only — **no duplicate Next.js metadata logic**.

Brightline: `seoTitle`, `metaDescription`, hero as OG surrogate.

Mirotech: `seoTitle`, `seoDescription`, hero/thumbnail as OG surrogate.

Page-level metadata remains in App Router layouts/pages.

---

## Permissions

Added for Brightline (Mirotech already had `mirotech.project.write`):

| Permission | Use |
| --- | --- |
| `brightline.project.create` | Draft creation |
| `brightline.project.write` | Status transitions |
| `mirotech.project.write` | Mirotech create + write |

Granted to Brightline **EDITOR** role and above. When `PLATFORM_IDENTITY_ENABLED` is off, `legacy_admin` subject is accepted (compatibility with Mission Control).

---

## Publishing prerequisites (definition of done)

A project is **ready to publish** when:

1. `evaluateCompleteness()` returns `complete: true`
2. Operator has publish permission (`brightline.journal.publish` / `mirotech.case-study.publish` — existing publish routes)
3. PublishingService / legacy sync path succeeds (Phase 22B wires explicit gate)

Phase 22A does **not** auto-publish on create.

---

## Related platform services

| Service | Role in workflow |
| --- | --- |
| ContentService | Read refs, public snapshots after create |
| MediaService | Attach assets after draft exists (no fake placeholders) |
| Asset Registry | Optional link via `PortfolioImage.assetId` / future work media |
| PublishingService | Cross-brand publish jobs (flag-gated) |
| JobService | Async hub/journal jobs |
| AuditService | `project.created` / `project.status.changed` |
| AuthorizationService | Tenant-scoped create/write |

---

## Tests

`lib/platform/projects/default-project-workflow-service.test.ts` — creation, tenant/kind guards, RBAC denial, slug conflict, completeness, status audit.

---

## Phase 22B (recommended)

- Studio ops “New project” UI wired to `ProjectWorkflowService`
- Publish button gated on `complete === true`
- Review queue (`IN_REVIEW`) for Mirotech `REVIEW` status
- Live URL verification step post-publish
- Optional `platform_project_workflow` metadata table if IN_REVIEW/APPROVED needed on Brightline without schema migration
