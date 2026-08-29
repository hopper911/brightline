# PHASE 24 — Bulk Ingestion Report

**Project:** Brightline Photography ↔ MiroTech Solutions  
**Phase:** 24 — Controlled bulk project ingestion  
**Date:** 2026-08-29

---

## 1. Import format

**Chosen format:** JSON array via `POST /api/studio/projects/import`.

Rationale: matches existing Studio/workflow JSON create paths, supports nested Mirotech fields, and aligns with other batch ingest (`analytics/snapshots`). CSV is not used for project ingest in this repo.

**Request body:**

```json
{
  "tenant": "brightline" | "mirotech",
  "kind": "work-project" | "mirotech-case-study",
  "dryRun": true,
  "records": [ { ... } ]
}
```

**Mirotech record fields:**

| Field | Required | Maps to |
| --- | --- | --- |
| `importKey` | Recommended | Idempotency registry |
| `title` | Yes | Hub title |
| `slug` | No | Slug (suffix on conflict) |
| `projectType` | No | Hub `projectType` |
| `summary` | No | Summary |
| `problem` | No | `challenge` |
| `solution` | No | `subtitle` |
| `results` | No | `outcome` |
| `technologies` | No | `tools[]` |
| `templateId` | No | Phase 23A template |
| `heroAssetId` | No | Platform asset → `heroImage` key |
| `thumbnailAssetId` | No | Platform asset → `thumbnailImage` key |
| `seo.title` / `seo.description` | No | SEO fields |

**Brightline record fields:**

| Field | Required | Maps to |
| --- | --- | --- |
| `importKey` | Recommended | Idempotency registry |
| `title` | Yes | Work project title |
| `slug` | No | Slug (reject on conflict) |
| `pillarSlug` | Yes | Work section via pillar |
| `summary` / `description` | No | Summary / description |
| `problem` | No | `context` |
| `solution` | No | `approach` |
| `results` | No | `highlight` |
| `technologies` | No | `tags[]` |
| `heroAssetId` | No | Platform asset → `MediaAsset` hero |
| `seo.title` / `seo.description` | No | SEO fields |

**Limits:** max **50** records per request (Vercel Hobby safety).

**Modules:** `lib/platform/projects/import/types.ts`, `bulk-import-service.ts`, `validate-import-row.ts`

---

## 2. Validation

Each record is validated **independently** via `validateImportRow()`.

**Per-row outcome:**

| Status | Meaning |
| --- | --- |
| `valid` | Can be imported (or dry-run eligible) |
| `invalid` | Missing required fields, bad pillar/template, slug conflict (Brightline) |
| `skipped` | Duplicate `importKey` already in registry |

**Report fields per row:** `errors[]`, `warnings[]` (e.g. missing summary, unknown asset id).

**Never fails entire batch** because one row is invalid — summary counts `valid`, `invalid`, `skipped` separately.

---

## 3. Dry-run

**Required workflow:** set `dryRun: true`.

Dry run:

- Validates all rows
- Reports projects that **would** be created
- Surfaces slug conflicts, invalid fields, missing required fields, unknown asset references
- **Writes nothing** (no hub/Prisma creates, no import key registration)

Each valid row includes warning: `Dry run — project would be created as DRAFT.`

---

## 4. Conflict handling

| Conflict | Behavior |
| --- | --- |
| **Duplicate `importKey`** | Row `skipped` — registry key `project_import_key:v1:{tenant}:{kind}:{importKey}` |
| **Brightline slug exists** | Row `invalid` — slug policy **reject** (no silent overwrite) |
| **Mirotech slug exists** | Row `valid` with **warning** — create uses **suffix** policy |
| **Existing project same slug** | No overwrite of existing project body |

Idempotency registry: `lib/platform/projects/import/import-key-registry.ts` (`SiteSetting`).

---

## 5. Media handling

- Import accepts **Platform asset IDs only** (`heroAssetId`, `thumbnailAssetId`) — not raw R2 keys from client JSON.
- Resolution: `getStudioAssetDetail(tenant, assetId)` — tenant must match.
- Unknown or cross-tenant asset → **warning** on row; import continues without that link.
- **Brightline:** asset `objectKey` → find/create `MediaAsset` → `heroMediaId`.
- **Mirotech:** asset `objectKey` → `heroImage` / `thumbnailImage` on hub patch.
- Arbitrary R2 keys from untrusted input are **not** accepted.

Module: `lib/platform/projects/import/resolve-import-assets.ts`

---

## 6. Draft creation

Import execute (`dryRun: false`) for **valid** rows only:

- **Brightline:** `createBrightlineWorkProjectDraft()` → `published: false`, workflow state `DRAFT`
- **Mirotech:** hub create + patch with `status: "DRAFT"` — never `PUBLISHED` / `APPROVED`
- Audit: `project.imported` per row (metadata: `importKey`, `source: bulk_import`)
- **Never** calls publish service or lifecycle transition to published

**Studio visibility:** imported projects appear under **Draft** and **Needs content** filters (`lifecycle === DRAFT`) in `/studio/projects` — same as manual creates.

---

## 7. Tests

| File | Coverage |
| --- | --- |
| `lib/platform/projects/import/bulk-import-service.test.ts` | Request parsing, normalization, dry-run no-create |
| Existing suite | Full vitest run must stay green |

**API:** `app/api/studio/projects/import/route.ts` — RBAC: `brightline.project.create` / `mirotech.project.write`

---

## Example

```bash
curl -X POST /api/studio/projects/import \
  -H "Content-Type: application/json" \
  -d '{
    "tenant": "mirotech",
    "kind": "mirotech-case-study",
    "dryRun": true,
    "records": [
      {
        "importKey": "noros-v1",
        "title": "Noros FinOps",
        "projectType": "SELF_DIRECTED_CASE_STUDY",
        "summary": "Concept case study scaffold.",
        "problem": "Manual reconciliation",
        "solution": "Agent-assisted workflow",
        "results": "Operator time reduced in pilot scope",
        "technologies": ["LLM", "Next.js"],
        "templateId": "fintech-compliance-platform"
      }
    ]
  }'
```

**Response summary:** `total`, `valid`, `invalid`, `skipped`, `created` (0 on dry run), `warnings`, plus per-row `rows[]`.

---

## Out of scope

- CSV upload UI (JSON API only in Phase 24)
- Auto-publish or bulk approve
- Overwriting existing project content
- Production bulk runs through Vercel without user approval (prefer local `tsx` calling `runProjectBulkImport` for large batches)
