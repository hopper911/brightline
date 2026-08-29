# PHASE 26 — Portfolio Readiness Report

**Project:** Brightline Photography ↔ MiroTech Solutions  
**Phase:** 26 — Portfolio completeness gate  
**Date:** 2026-08-29

---

## 1. Brightline readiness rules

Evaluated in `lib/platform/portfolio/evaluate-brightline-readiness.ts`. Data source: Prisma `WorkProject` (published), work pillar settings, filesystem route probes.

| Check ID | Rule | Default severity |
| --- | --- | --- |
| `min-published` | Published count ≥ `config.brightline.minPublishedProjects` | Blocker (only when configured) |
| `pillar-*` | Each visible photography pillar has ≥ `minPublishedPerPillar` published projects | Warning (only when configured) |
| `featured-hero` | All **featured** published projects have hero media keys | Blocker |
| `published-completeness` | Every published project passes `validateBrightlineProjectCompleteness` (content + SEO) | Blocker |
| `og-media` | Published projects have Open Graph asset (hero full/thumb key) | Blocker |
| `gallery-hero` | Published projects with gallery rows but no `heroMediaId` | Warning |
| `media-keys` | `validateProjectPublishMedia` passes for all published work projects | Blocker |
| `public-routes` | Published projects map to pillar slug + slug (`/work/{pillar}/{slug}`) | Blocker |
| `route-contact` … `route-about` | App Router pages exist for `/contact`, `/galleries`, `/services`, `/about` | Blocker |
| `client-portal` | Client portal route exists; count of published client `Project` rows (informational) | Warning |

**Config:** `SiteSetting` key `portfolio_readiness_config:v1` — optional `minPublishedProjects`, `minPublishedPerPillar`. No hardcoded minimum counts when unset.

---

## 2. MiroTech readiness rules

Evaluated in `lib/platform/portfolio/evaluate-mirotech-readiness.ts`. Data: `listHubProjects()`, workflow state, publishing job queue.

| Check ID | Rule | Default severity |
| --- | --- | --- |
| `min-published` | Mirotech-published case studies ≥ `config.mirotech.minPublishedProjects` | Blocker (only when configured) |
| `category-*` | Each `requiredCategories` entry has ≥1 published Mirotech case study | Blocker (only when configured) |
| `featured-hero` | Featured Mirotech case studies have hero or thumbnail media | Blocker |
| `homepage-featured` | `featuredMirotech` projects are `PUBLISHED` and `publishMirotech` | Blocker |
| `og-media` | Published case studies have Open Graph media (hero/thumbnail) | Blocker |
| `published-completeness` | Published Mirotech targets pass `validateMirotechProjectCompleteness` | Blocker |
| `media-keys` | `validateProjectPublishMedia` for all Mirotech-published case studies | Blocker |
| `public-slugs` | Published case studies have non-empty slug | Blocker |
| `publishing-jobs` | No failed rows in platform publishing job queue (`mirotech`) | Blocker |
| `workflow-publish-failed` | No workflow state with `publishFailedAt` | Blocker |
| `pipeline-review` | Case studies in `IN_REVIEW` or `APPROVED` (pipeline backlog) | Warning |
| `legacy-thumbnail` | Hero present but no dedicated thumbnail (fallback) | Warning |

---

## 3. Blocking vs warning conditions

**Blocker** — fails the tenant gate. `ready: false`. Listed under **BLOCKERS** in the dashboard.

**Warning** — does not block launch. Listed under **WARNINGS**. May reduce score (failed warning checks count in `%`).

**Site ready rule:** `ready === true` only when `blockers.length === 0`. Warnings alone never mark the portfolio ready-for-launch in the sense of “all green,” but they do not flip `ready` to false.

**Score:** `round(passedChecks / totalChecks * 100)` across all checks emitted for that tenant (including config-gated and conditional checks).

Orchestration: `buildTenantReadiness()` in `lib/platform/portfolio/readiness-types.ts`.

---

## 4. Readiness dashboard

| Surface | Path |
| --- | --- |
| Studio page | `/studio/portfolio-readiness` |
| API | `GET /api/studio/portfolio-readiness` |
| Nav | Studio platform nav → **Portfolio readiness** |

**Modules:**

- `lib/platform/portfolio/readiness-config.ts` — optional thresholds
- `lib/platform/portfolio/readiness-types.ts` — report types + scoring
- `lib/platform/portfolio/evaluate-brightline-readiness.ts`
- `lib/platform/portfolio/evaluate-mirotech-readiness.ts`
- `lib/platform/portfolio/portfolio-readiness.ts` — orchestrator
- `components/studio/StudioPortfolioReadiness.tsx` — UI (score, READY badge, blockers, warnings, all checks)
- `app/studio/portfolio-readiness/page.tsx`

**Example output shape:**

```json
{
  "generatedAt": "…",
  "brightline": {
    "tenant": "brightline",
    "title": "Brightline Portfolio Readiness",
    "score": 92,
    "ready": false,
    "blockers": [ … ],
    "warnings": [ … ],
    "checks": [ … ]
  },
  "mirotech": { … }
}
```

Links to **Completion queue** and **Publishing** for remediation.

Tenant visibility follows Studio project RBAC (Brightline-only / Mirotech-only operators see one card).

---

## 5. Tests

| File | Coverage |
| --- | --- |
| `lib/platform/portfolio/readiness-types.test.ts` | Score calculation, blocker vs warning `ready` semantics |

Full vitest suite must remain green.

---

## Relation to Phase 25

| Phase 25 | Phase 26 |
| --- | --- |
| Per-project completion queue | Site-level aggregate gate |
| Operator workflow actions | Launch readiness score + blockers |
| `/studio/projects/completion` | `/studio/portfolio-readiness` |

Use the completion queue to fix items surfaced as portfolio blockers.

---

**STOP** — Phase 26 deliverable complete.
