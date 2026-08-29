# PHASE 14B — Test Architecture Report

**Date:** 2026-08-29  
**Branch:** `architecture/platform-foundation`  
**Policy:** Layered testing focused on high-regression workflows—not 100% coverage.

---

## 1. Existing tests

| Item | State |
| --- | --- |
| **Framework** | Vitest 3.x (unit/integration), Playwright 1.58 (E2E) |
| **Unit / integration** | **128** test files, **521+** tests in `app/**` and `lib/**` |
| **E2E** | **1** spec: `e2e/package-delivery.spec.ts` (delivery package vertical) |
| **Fixtures** | Delivery smoke seed (`scripts/seed-delivery-smoke.ts`); **new** `lib/testing/fixtures/` |
| **Mocks** | Prisma, R2/S3, platform repositories, audit, authorization repos |
| **DB in Vitest** | **No live DB** — Prisma mocked |
| **DB in CI E2E** | Ephemeral Postgres 16, `migrate deploy`, `seed:delivery-smoke:empty` |
| **CI** | `ci.yml`: static job + e2e + build job |

---

## 2. Critical workflows identified

### Brightline

| Workflow | Covered |
| --- | --- |
| Client delivery package (token, expiry, IDOR) | Unit + E2E |
| Gallery access codes / client view rules | Unit (`authz.test.ts`) |
| Final package token expiry | Unit |
| Private vs public media keys | Unit |
| Upload MIME / SSRF-related MIME block | Unit + truth locks |
| Admin portfolio UI CRUD | **Not E2E** — manual/preview |
| Media upload pipeline | Unit (MediaService integrations, mocked provider) |

### Mirotech (in-repo contracts)

| Workflow | Covered |
| --- | --- |
| Case study / hub content read | Unit (content adapters) |
| Publish hub/journal | Unit (publishing adapter, job handlers) |
| CMS media key extraction | Unit |
| Public project page render | **Not E2E** in Brightline CI |

### Platform

| Service | Covered |
| --- | --- |
| MediaService | `default-media-service.test.ts`, integration modules |
| ContentService | Adapters + `default-content-service.test.ts` |
| PublishingService | `default-publishing-service.test.ts`, async sync tests |
| RBAC / Authorization | `authorization.test.ts`, `rbac.test.ts`, `permissions.test.ts` |
| SSO | `sso-exchange.test.ts` |
| JobService | `default-job-service.test.ts` |
| Audit | `audit-service.test.ts`, `record-safely.test.ts` |
| Asset registry / resolve | `registry-service.test.ts`, `resolve-domain-media.test.ts` |

---

## 3. Unit coverage improvements (this phase)

| Addition | Purpose |
| --- | --- |
| `lib/testing/fixtures/platform.ts` | Stable synthetic platform test data |
| `lib/platform/audit/record-safely.test.ts` | Audit failure does not throw callers |
| `lib/platform/degraded/platform-degraded-behavior.test.ts` | Registry failure, job FAILED, media errors |
| `default-job-service.test.ts` | Explicit FAILED status when handler throws |

No drive-by coverage of low-value UI states.

---

## 4. Integration coverage

Integration-style tests use **mocked Prisma** at service boundaries:

- `lib/authz/authz.test.ts` — delivery, gallery, final-package, MIME
- `lib/client-api/delivery-package.test.ts` — package IDOR
- Platform integration modules (`phase-3d`, gallery-sign, site-media-upload-url, etc.)

**No new live-DB Vitest integration suite** — CI Postgres reserved for Playwright job.

---

## 5. E2E journeys

| Journey | Status |
| --- | --- |
| Open valid delivery package page | **E2E** (`package-delivery.spec.ts`) |
| Reject wrong / expired package token | **E2E** |
| Manifest API + download IDOR | **E2E** |
| Admin portfolio create/update | **Not added** (auth fixture cost) |
| Mirotech publish → public page | **Not added** (separate deploy + auth) |

Pyramid preserved: one critical client vertical E2E, not full UI matrix.

---

## 6. Security tests

Existing + consolidated themes:

| Theme | Location |
| --- | --- |
| Wrong tenant (content) | Content adapter tests |
| Cross-tenant job read | `platform-job-access.test.ts`, `default-job-service.test.ts` |
| Missing permission | `authorization.test.ts` |
| Expired SSO / replay / audience | `sso-exchange.test.ts` |
| Package / gallery IDOR | `authz.test.ts`, E2E package spec |
| Unauthenticated MIME / private keys | `authz.test.ts`, `media-key-access.test.ts` |

Cross-tenant **asset** resolution: tenant scoping is caller responsibility; `resolve-reference` tests unknown asset ID.

---

## 7. Failure-mode tests

| Scenario | Tests |
| --- | --- |
| Audit unavailable | `record-safely.test.ts`, `audit-service.test.ts` |
| Registry unavailable | `registry-service.test.ts`, `platform-degraded-behavior.test.ts` |
| Job fails → FAILED | `default-job-service.test.ts`, `platform-degraded-behavior.test.ts` |
| MediaProvider failure | `platform-degraded-behavior.test.ts`, `media-infrastructure.test.ts` |
| Legacy fallback when asset read off | `resolve-domain-media.test.ts` |

---

## 8. Test-data strategy

| Rule | Implementation |
| --- | --- |
| Synthetic IDs | `test-user-0001`, `operator@example.test` |
| No production PII | Fixtures use `.test` TLD and fake gallery keys |
| E2E smoke | `seed:delivery-smoke:empty` → `tmp/delivery-smoke.json` |
| Reuse factories | `lib/testing/fixtures/index.ts` |

---

## 9. CI integration

Unchanged pipeline structure from Phase 14A; new tests run in existing `npm test` step.

| Job | Tests |
| --- | --- |
| `static` | Full Vitest suite |
| `e2e` | Playwright package vertical |
| `build` | Production build only |

Mirotech repo CI not modified (independent deploy).

---

## 10. Remaining meaningful gaps

| Gap | Risk | Suggested follow-up |
| --- | --- | --- |
| Admin authenticated E2E | Portfolio/gallery admin regressions | Playwright auth fixture + seeded admin session |
| Live Mirotech public render E2E | Publish pipeline UI gaps | Mirotech repo or cross-preview smoke |
| Prisma integration tests (local) | Complex query/migration regressions | Optional `vitest.integration` with docker Postgres |
| R2 live smoke | Provider config drift | Optional manual `scripts/` smoke—not CI |
| Studio publish → Mirotech journal | Dual-brand publish path | Extend publishing job integration tests |
| Branch protection + required CI | Merge without tests | Phase 14B ops (GitHub settings) |

---

## Files created/modified

| File | Change |
| --- | --- |
| `docs/engineering/testing.md` | **Created** |
| `docs/architecture/PHASE-14B-test-architecture-report.md` | **Created** |
| `lib/testing/fixtures/platform.ts` | **Created** |
| `lib/testing/fixtures/index.ts` | **Created** |
| `lib/platform/audit/record-safely.test.ts` | **Created** |
| `lib/platform/degraded/platform-degraded-behavior.test.ts` | **Created** |
| `lib/platform/jobs/default-job-service.test.ts` | Job FAILED case |

---

## Runtime production behavior changed

**No.**

---

## Summary

Phase 14B documents the existing **521+** Vitest tests and **1** Playwright vertical, adds **stable fixtures**, **failure-mode** and **record-safely** tests, and publishes `docs/engineering/testing.md`. Test pyramid: many unit tests, mocked integration boundaries, minimal E2E. No live R2 or production DB in ordinary automation.
