# PHASE 23A — Project Template Report

**Project:** Brightline Photography ↔ MiroTech Solutions  
**Phase:** 23A — Mirotech case study template system  
**Date:** 2026-08-29

---

## 1. Templates created

Five Mirotech `mirotech-case-study` workflow templates (max portfolio-aligned set):

| ID | Label |
| --- | --- |
| `ai-saas-platform` | AI SaaS Platform |
| `ai-automation-agent-workflow` | AI Automation / Agent Workflow |
| `data-intelligence-platform` | Data Intelligence Platform |
| `fintech-compliance-platform` | FinTech / Compliance Platform |
| `operational-workflow-saas` | Operational Workflow SaaS |

**Removed from the workflow registry (not in portfolio direction for 23A):** `product-design-case-study`, `full-stack-web-app`.

**Legacy id mapping (22A → 23A):**

- `ai-saas-case-study` → `ai-saas-platform`
- `automation-platform` → `ai-automation-agent-workflow`
- `data-platform` → `data-intelligence-platform`

**Source modules:**

- `lib/platform/projects/mirotech-template-definitions.ts` — canonical structure
- `lib/platform/projects/templates.ts` — Studio/API registry (`structure` on each Mirotech template)

Brightline work-project templates unchanged (five photography pillars).

---

## 2. Fields per template

Each Mirotech template defines the same **core field scaffold** (labels + hints; no prefilled claims):

| Key | Label | Required |
| --- | --- | --- |
| `summary` | Summary | Yes |
| `role` | Role | Yes |
| `challenge` | Challenge | Yes |
| `outcome` | Outcome | Yes |
| `projectDisclaimer` | Concept disclaimer | Optional (warned when empty) |

**Defaults per template** (taxonomy only):

| Template | `projectType` | `categories` | `disciplines` |
| --- | --- | --- | --- |
| AI SaaS Platform | `SELF_DIRECTED_CASE_STUDY` | AI, SaaS | Product, Engineering |
| AI Automation / Agent Workflow | `MIROTECH_INITIATIVE` | AI, Automation | Engineering, Operations |
| Data Intelligence Platform | `RESEARCH_LED_CONCEPT` | Data, Analytics | Data, Engineering |
| FinTech / Compliance Platform | `INDEPENDENT_CONCEPT` | FinTech, Compliance | Engineering, Product |
| Operational Workflow SaaS | `CLIENT_COMMISSION` | SaaS, Operations | Product, Engineering |

**Technology categories** (recommended tags, not auto-written): per-template lists such as LLM/AI, Cloud, Automation, Governance, Security, Workflow — see `technologyCategories` on each def.

---

## 3. Section structures

Templates seed **empty** hub sections on create (`body: ""`). Section titles and types differ by narrative:

**AI SaaS Platform (6):** Overview and role · Problem and users · AI capability scope · Product walkthrough (gallery) · Architecture and delivery · Target outcomes and reflection (metrics)

**AI Automation / Agent Workflow (6):** Overview and role · Workflow problem · Agent and automation design · Before and after workflow (gallery) · Integrations and reliability · Target outcomes and reflection (metrics)

**Data Intelligence Platform (6):** Overview and role · Data problem and sources · Pipeline and modeling · Insights and dashboards (gallery) · Governance and access · Target outcomes and reflection (metrics)

**FinTech / Compliance Platform (6):** Overview and role · Regulatory and risk context · Controls and auditability · Platform architecture (gallery) · Security posture · Target outcomes and reflection (metrics)

**Operational Workflow SaaS (6):** Overview and role · Operational problem · Workflow design · Implementation highlights (gallery) · Rollout and change management · Target outcomes and reflection (metrics)

Each section includes an authoring **hint** (Studio create UI + hub editors); hints are not persisted as body copy.

---

## 4. Media expectations

Shared **media slots** per template:

| Slot | Required | Expectation |
| --- | --- | --- |
| `heroImage` | Yes | Primary case study visual (UI, architecture, or key deliverable) |
| `thumbnailImage` | No | Work index card thumbnail |
| `backgroundMedia` | No | Optional header ambient media |

Gallery sections document **recommended** slot counts (e.g. 3–8 UI visuals, workflow diagrams, dashboard screenshots) via `mediaExpectation` hints — structure only, no assets generated.

**SEO structure** (hints, not auto-filled claims):

- Title pattern: `{Project title} | MiroTech Solutions`
- Description hint: problem + honest scope, ≤160 chars, no fabricated metrics
- OG asset: hero image slot

---

## 5. AI drafting support

**Present — optional, draft-only.**

| Surface | Path |
| --- | --- |
| Preview draft (no save) | `POST /api/studio/projects/draft-from-brief` |
| Create with draft overlay | `POST /api/studio/projects` with `projectBrief` + `applyTemplateDraft: true` |
| Implementation | `lib/platform/projects/mirotech-template-draft.ts` |

**Guards:**

- Uses existing OpenAI runtime when configured; otherwise returns **structure-only** empty shells.
- Response always includes `draftOnly: true`; no publish path consumes AI output automatically.
- System prompts inherit honesty rules (no invented ROI, customers, certifications, or live KPIs).
- Studio create checkbox: “Generate initial draft from brief (review before publish — never auto-publishes claims)”.

**Not replaced:** Admin hub `POST /api/admin/studio-hub/generate-section-copy` remains for per-section editing in legacy hub UI.

---

## 6. Validation

**Base completeness** (unchanged publish gate): `validateMirotechProjectCompleteness` — title, slug, summary, hero, sections/challenge/outcome, publish flag, SEO.

**Template-aware extensions (23A):**

- `templateId` stored in `SiteSetting` workflow state (`project_workflow_state:v1:*`) at create.
- When `templateId` is set:
  - Required **role** check added to completeness.
  - Missing **template section titles** → `missing[]` entries `template section: …` (blocks `complete` until shells match template).
  - Empty **projectDisclaimer** → warning when conceptual work may need a disclaimer.
- `validateMirotechCaseStudyAgainstTemplate` — explicit structure pass (`lib/platform/projects/mirotech-template-apply.ts`).
- Workflow snapshot loads `role`, `projectDisclaimer`, `sectionTitles`, and `templateId` for ongoing evaluation.

**Tests:**

- `lib/platform/projects/mirotech-template-definitions.test.ts`
- `lib/platform/projects/mirotech-template-apply.test.ts`
- Updated `default-project-workflow-service.test.ts` (template id)

---

## Files touched (summary)

| Area | Files |
| --- | --- |
| Definitions | `mirotech-template-definitions.ts`, `mirotech-template-apply.ts`, `mirotech-template-draft.ts` |
| Registry | `templates.ts` |
| Create path | `adapters/mirotech-case-study-adapter.ts`, `default-project-workflow-service.ts` |
| State / snapshot | `workflow-state.ts`, `workflow-snapshot.ts` |
| Completeness | `completeness/mirotech-case-study.ts` |
| API | `app/api/studio/projects/draft-from-brief/route.ts`, `projects/route.ts`, `projects/templates/route.ts` (unchanged handler; richer payload) |
| UI | `components/studio/StudioProjectCreateForm.tsx` |
| Docs | `docs/product/project-workflow.md` |

---

## Out of scope (later phases)

- Brightline work-project section templates (photography pillars use pillar defaults only).
- Auto-sync with `lib/dual-brand/case-study-template.ts` hub pills (separate product-design/visual UI registry for dual-brand hub).
- Persisting `templateId` on Mirotech hub records (currently Brightline `SiteSetting` workflow state only).
