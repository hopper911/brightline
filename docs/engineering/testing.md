# Testing

**Brightline Photography** (`brightlinephotography.com`)  
**Related:** Mirotech (`mirotech.solutions`) — separate deploy; platform tests in this repo cover shared `lib/platform/*`  
**Last updated:** 2026-08-29 (Phase 14B)

This document describes the **layered test strategy** for Brightline. It does not aim for 100% coverage—it prioritizes workflows where regression would materially hurt users or operations.

**See also:** [deployment.md](../operations/deployment.md) (CI pipeline), [production-runbook.md](../operations/production-runbook.md).

---

## Test pyramid

| Layer | Scope | Count | Speed |
| --- | --- | --- | --- |
| **Unit** | Domain/service logic, pure helpers, mocked I/O | Many (~500+ tests) | Fast |
| **Integration** | Service boundaries with mocked Prisma/R2 (no live DB in Vitest) | Moderate | Fast |
| **E2E** | Critical user journeys via Playwright + ephemeral Postgres | Small (1 vertical today) | Slow |

**Rule:** Do not turn every UI state into an E2E test. Prefer unit/integration for business rules; E2E for token-gated client flows and smoke paths.

---

## Frameworks and locations

| Tool | Config | Includes |
| --- | --- | --- |
| **Vitest** | `vitest.config.ts` | `app/**/*.test.{ts,tsx}`, `lib/**/*.test.{ts,tsx}` |
| **Playwright** | `playwright.config.ts` | `e2e/**/*.spec.ts` |

```bash
npm test              # Vitest unit + integration (all lib/app tests)
npm run test:watch    # Vitest watch mode
npm run test:e2e      # Playwright (starts prod server unless PLAYWRIGHT_SKIP_WEBSERVER)
```

---

## What CI executes

GitHub Actions `ci.yml` (on PR + push to `main`, `work-v2`, `architecture/platform-foundation`):

| Job | Steps |
| --- | --- |
| **static** | `lint`, `typecheck`, `npm test`, migration safety, env template |
| **e2e** | Ephemeral Postgres → `prisma migrate deploy` → `seed:delivery-smoke:empty` → `npm run build` → Playwright |
| **build** | `npm run build` with dummy `DATABASE_URL` |

E2E uses **CI Postgres only** (`brightline_ci` on `localhost:5432`). Never production Neon.

---

## Database testing strategy

| Context | Database | Cleanup |
| --- | --- | --- |
| **Vitest (default)** | **None** — Prisma mocked via `vi.mock("@/lib/prisma")` | N/A |
| **Playwright CI** | Ephemeral Postgres service in `ci.yml` | Fresh DB per job; migrate + seed each run |
| **Local E2E** | Your `DATABASE_URL` (must not be production) | `seed:delivery-smoke:empty` writes `tmp/delivery-smoke.json` |

**Never** point tests at production `DATABASE_URL`. `deploy:check:env` and operator runbooks reinforce this.

---

## Media / R2 testing

Ordinary automated tests **do not** call live R2.

| Approach | Where |
| --- | --- |
| Mock `MediaProvider` | `default-media-service.test.ts`, integration modules |
| Mock S3 client | `r2-media-provider.test.ts` (normalized errors) |
| Key allowlist rules | `media-key-access.test.ts`, `authz.test.ts` |
| Optional live smoke | Operator scripts only—not CI |

Asset registry tests mock `upsertPlatformAssetFromStorageRef`; registry failures are tested as degraded success in `platform-degraded-behavior.test.ts`.

---

## Test fixtures

Stable synthetic factories live in `lib/testing/fixtures/`:

- `testPlatformContext()`, `testPlatformUser()`, `testPlatformMembership()`
- `testPlatformAsset()`, `testJobRecord()`
- IDs like `test-user-0001`; emails `operator@example.test`

**Do not** hard-code real client names, gallery tokens, or production operator emails in tests.

E2E delivery smoke uses `scripts/seed-delivery-smoke.ts` with synthetic package tokens written to `tmp/delivery-smoke.json`.

---

## Critical workflows covered

### Brightline (public + client)

| Workflow | Test layer | Primary files |
| --- | --- | --- |
| Delivery package access (token, expiry, IDOR) | Unit + E2E | `lib/authz/authz.test.ts`, `lib/client-api/delivery-package.test.ts`, `e2e/package-delivery.spec.ts` |
| Gallery access codes / expiry | Unit | `lib/authz/authz.test.ts` |
| Final package token expiry | Unit | `lib/authz/authz.test.ts` |
| Private vs public media keys | Unit | `lib/media-key-access.test.ts`, `authz.test.ts` |
| Upload MIME allowlist | Unit | `authz.test.ts`, `lib/truth/truth.test.ts` |

### Platform services

| Workflow | Test layer | Primary files |
| --- | --- | --- |
| RBAC / permissions | Unit | `lib/platform/authorization/*`, `lib/platform/identity/rbac.test.ts` |
| SSO exchange (expired, replay, wrong audience) | Unit | `lib/platform/identity/sso/sso-exchange.test.ts` |
| Cross-tenant job read | Unit | `default-job-service.test.ts`, `platform-job-access.test.ts` |
| Wrong tenant content read | Unit | `brightline-content-adapter.test.ts`, `mirotech-content-adapter.test.ts` |
| MediaService signing | Unit | `default-media-service.test.ts`, gallery/sign integration tests |
| ContentService adapters | Unit | `default-content-service.test.ts`, adapter tests |
| PublishingService / jobs | Unit | `default-publishing-service.test.ts`, publishing integration tests |
| Job enqueue / FAILED status | Unit | `default-job-service.test.ts`, `platform-degraded-behavior.test.ts` |
| Audit unavailable → caller continues | Unit | `audit-service.test.ts`, `record-safely.test.ts` |
| Asset registry unavailable → upload continues | Unit | `registry-service.test.ts`, `platform-degraded-behavior.test.ts` |
| Legacy asset fallback | Unit | `resolve-domain-media.test.ts` |

### Mirotech (in-repo adapters)

| Workflow | Test layer | Primary files |
| --- | --- | --- |
| Case study / hub content read | Unit | `mirotech-content-adapter.test.ts` |
| Publish to Mirotech hub/journal | Unit | `mirotech-publishing-adapter.test.ts`, job handler tests |
| CMS media keys / phase integrations | Unit | `phase-3f-mirotech-cms.test.ts`, R2 key audit tests |

### Not yet E2E (by design)

- Admin login + portfolio CRUD UI
- Studio case-study publish → live Mirotech page
- Full media upload through browser

These remain manual/preview validation or future E2E if auth fixtures are added.

---

## Security test themes

Explicit coverage for:

- Wrong tenant (content adapters, job status, publishing job HTTP access)
- Missing permission (authorization service, RBAC)
- Cross-tenant asset resolution (callers must tenant-scope lookups; registry resolve-reference tests)
- Expired SSO exchange (`sso-exchange.test.ts`)
- Unauthenticated mutation boundaries (`authz.test.ts`, package IDOR, MIME rejection)

---

## Failure-mode tests

| Scenario | Expected behavior | Tests |
| --- | --- | --- |
| AuditService write fails | Caller gets `ok: false`; no throw via `recordAuditSafely` | `record-safely.test.ts`, `audit-service.test.ts` |
| Asset registry upsert fails | Register returns `skipped: true, reason: failed` | `registry-service.test.ts`, `platform-degraded-behavior.test.ts` |
| Job handler throws | Job `FAILED`, `job.failed` audit | `default-job-service.test.ts`, `platform-degraded-behavior.test.ts` |
| MediaProvider signing fails | Normalized `MediaError` propagates | `platform-degraded-behavior.test.ts`, `media-infrastructure.test.ts` |
| Asset read flag off | Legacy key fallback | `resolve-domain-media.test.ts` |

---

## Adding tests

1. **Prefer unit** for new business rules in `lib/` (mirror file naming: `foo.ts` → `foo.test.ts`).
2. **Mock** `@/lib/prisma` and R2/S3—not live services.
3. **Use fixtures** from `lib/testing/fixtures` for platform IDs and contexts.
4. **E2E only** when the journey crosses HTTP + auth/token gates that unit tests cannot represent cheaply.
5. Run `npm test` before push; CI runs the full suite.

---

## Mirotech independent deploy

Mirotech’s Vercel project is separate. Brightline CI does not deploy or E2E-test the Mirotech-only site shell. Platform adapter tests in this repo validate Mirotech **integration contracts** used by Brightline admin/studio.
