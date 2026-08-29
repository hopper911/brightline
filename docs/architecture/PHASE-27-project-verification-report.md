# PHASE 27 — Project Verification Report

**Project:** Brightline Photography ↔ MiroTech Solutions  
**Phase:** 27 — Published project verification  
**Date:** 2026-08-29

---

## 1. Verification mechanism

Per-project verification runs after successful publish and on demand via Studio APIs. Results are stored on `StoredProjectWorkflowState` in `SiteSetting` (`project_workflow_state:v1:*`).

**Modules:**

| Module | Role |
| --- | --- |
| `lib/platform/projects/verify-published-project.ts` | Load project, probe network, apply state |
| `lib/platform/projects/verification/evaluate-verification.ts` | Pure check aggregation → status flags |
| `lib/platform/projects/verification/network-check.ts` | SSRF-safe `HEAD` probes |
| `lib/platform/projects/verification/types.ts` | Result types + Studio display labels |

**Orchestration:** `verifyPublishedProject()` → `evaluatePublishedProjectVerification()` → `applyPublishedProjectVerification()`.

**Auto-run:** `finalizeProjectPublishSuccess()` clears prior flags, then runs verification (non-blocking — publish success is never rolled back).

---

## 2. Public route checks

| Tenant | Internal resolution | HTTP probe |
| --- | --- | --- |
| **Brightline** | `getSectionToPillarSlugMap()` + `getProjectByPillarAndSlug()` | `HEAD` on `brightlineWorkProjectPublicPath(pillar, slug)` |
| **MiroTech** | Hub project `PUBLISHED` + `publishMirotech` + slug/title | `HEAD` on `mirotechCaseStudyPublicPath(slug)` |

Checks:

- Public route resolves (canonical path computable)
- Route data resolves in source (Brightline Prisma / Mirotech hub)
- Public page `HEAD` returns success (200/304)
- Transient HTTP errors (timeout, 5xx, 429) → **warning**, not hard failure

---

## 3. Media checks

- **Key validation:** `validateProjectPublishMedia()` (hero + gallery keys in DB — no full download)
- **Hero resolve:** optional `HEAD` on hero URL via `getPublicR2Url()` (lightweight; gallery originals not probed)
- Mirotech hero may be full URL or R2 key

---

## 4. SEO checks

Reuses completeness validators (includes `buildSeoCompletenessChecks`):

- SEO title and description
- Open Graph asset (hero key proxy)
- Title and slug presence
- Required project sections / case study content (`completeness.complete`)

Published snapshot drift (slug/title changed since publish) → **warning**.

---

## 5. Failure handling

**Stored flags** (mutually exclusive outcome per run):

| Field | Meaning |
| --- | --- |
| `verificationHealthy` | All checks passed |
| `verificationWarning` | Non-blocker issues (transient HTTP, snapshot drift) |
| `verificationFailed` | Blocker check failed |
| `verificationCheckedAt` | ISO timestamp |
| `verificationReason` | Human summary |
| `verificationDetails` | Failed check ids |

**Does not unpublish** on any verification outcome (including transient network failure).

Publish failures remain separate: `publishFailedAt` / `publishFailedReason`.

---

## 6. Studio integration

| Surface | Path |
| --- | --- |
| Projects dashboard | `/studio/projects` — **Verify** column: Verified / Warning / Failed |
| Completion queue | `published-needs-verification` includes verification warning/failed |
| Single verify | `POST /api/studio/projects/{projectRef}/verify` |
| Batch verify | `POST /api/studio/projects/verify-published` (max 30 published, optional `tenant`) |

**Dashboard row fields:** `verificationStatus`, `verificationLabel`, `verificationReason`, `publicPath`.

---

## 7. Tests

| File | Coverage |
| --- | --- |
| `lib/platform/projects/verification/evaluate-verification.test.ts` | Healthy/failed/warning/transient/drift + display helpers |

Full vitest suite must remain green.

---

**STOP** — Phase 27 deliverable complete.
