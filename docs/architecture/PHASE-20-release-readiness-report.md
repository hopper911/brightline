# FINAL RELEASE READINESS REPORT — PHASE 20

**Project:** Brightline Photography ↔ MiroTech Solutions  
**Date:** 2026-08-29  
**Branch reviewed:** `architecture/platform-foundation` (Brightline) · `main` (Mirotech)  
**Policy:** Verification gate only — no implementation work in this phase.

---

## FINAL CLASSIFICATION

### **READY WITH DOCUMENTED LIMITATIONS**

Production public applications are **live and responding**. Platform architecture is **implemented and documented** (Phases 9–19). Strangler migration is **intentionally incomplete** — most `PLATFORM_*` flags remain off in production; legacy paths are still the default for media, content, publishing, jobs, and audit.

**Not classified READY** because: GitHub CI is **broken** on both repos (missing/wrong `package-lock.json` paths), `lint` / `typecheck` fail locally, E2E was not re-run in this gate, and operational recovery gaps (6h Neon PITR, no R2 cold backup) remain documented.

**Not classified NOT READY** because: no critical production outage observed, public smoke checks pass, unit tests and production build pass locally, and prior production deploys (Phase 15C) are healthy.

---

## 1. Overall status

| Dimension | Status |
| --- | --- |
| Architecture documentation | **Complete** (Phase 13 + ADRs 001–016) |
| Platform services (code) | **Implemented** behind feature flags |
| Production cutover | **Partial** — only `PLATFORM_IDENTITY_ENABLED=true` in prod env snapshot |
| Public site stability | **Stable** — HTTP 200 on core routes (2026-08-29 smoke) |
| CI gate | **Broken** — workflows fail before `npm ci` (lockfile path) |
| Static analysis gate | **Red** — lint (64 errors) + typecheck (multiple TS errors); build uses `ignoreBuildErrors: true` |
| Test suite (unit) | **Green** — 532 Brightline + 42 Mirotech Vitest tests |
| E2E | **Not executed** in Phase 20 (requires Postgres + seed + Playwright) |
| Recovery posture | **Documented gaps** — Phase 18 |

---

## 2. Brightline status

### Category 1 — Public application

| Check | Result |
| --- | --- |
| Core routes (`/`, `/work`, `/galleries`, `/contact`) | **200** production |
| SEO (`robots.txt`, `sitemap.xml`) | **200** |
| Root layout metadata | `app/layout.tsx` — `metadataBase`, OG, Twitter |
| Redirects | `/client_access`, `/client-access` → `/client` (`next.config.ts`) |
| Images | R2 via `/api/media/public` redirect; `images.unoptimized: true` by design |
| Forms | Contact + client flows present; not exercised in this gate |
| 404 | **404** with CSP on unknown path |
| 500 | `app/error.tsx`, `app/global-error.tsx`, Sentry hook |

### Category 2 — Admin / Studio

| Check | Result |
| --- | --- |
| `/admin/login` | **200** |
| `/studio` | **200** (cookie gate at edge for mutations) |
| SSO | Implemented; identity flag **on** in prod env |
| RBAC | Platform RBAC exists; **~170 `/api/admin/*` routes still use binary `admin_access` only** |
| Tenant switching | Studio ops tenant cookie + membership when identity on |
| Handoff | `ho1` default **on** parallel to SSO |

### Category 3 — Media

| Check | Result |
| --- | --- |
| Upload/sign dual paths | Legacy default when `PLATFORM_MEDIA_ENABLED` off |
| Public media | Prefix policy + `/api/media/public` |
| Private gallery | Session + gallery membership checks (unit tested) |
| Signed downloads | TTL-bound signed URLs (unit tested) |
| Asset registry | Optional; flag off in prod snapshot |
| Legacy fallbacks | **Intentional** — `portfolioImageLegacyReference`, direct R2 admin |

### Category 4 — Content

| Check | Result |
| --- | --- |
| CMS authority | Prisma routes (`/admin/work`, blog `SiteSetting`, portfolio) |
| ContentService | Flag off — Studio content empty state |
| Cross-published | Blog → Mirotech via `journal-ingest` / legacy sync path |
| Draft/publish | Work/blog status enums + Mirotech publish flags in content model |

### Category 5 — Publishing

| Check | Result |
| --- | --- |
| PublishingService | Implemented; flag off → legacy sync |
| Jobs | `platform_jobs` + cron drain; flag off → sync fallback |
| Retry | Admin job retry API + Studio publishing UI when flags on |
| Failure reporting | Metrics endpoint + structured logs (manual runbook) |

### Category 6 — Data

| Check | Result |
| --- | --- |
| Tenant / User / Membership | Constraints per Phase 12B |
| Asset registry | Global `(provider, bucket, objectKey)` unique |
| Audit / Jobs | Append-only audit; job idempotency key unique |
| Orphan risk | `PortfolioImage.assetId` ~0% linked; bridge tables sparse — **no schema orphans flagged as critical** |

### Performance (Brightline)

Post-15C Lighthouse: home score **76**, LCP **6.2 s** (improved from 12.4 s); `/work` score **98**, LCP **2.2 s**. See [PHASE-15C](./PHASE-15C-post-deploy-performance-report.md).

---

## 3. MiroTech status

| Check | Result |
| --- | --- |
| Public routes (`/`, `/work`, `/contact`) | **200** production |
| `robots.txt` | **200** |
| 404 | **404** on unknown path |
| Admin | HMAC cookie (`lib/admin-session.ts`); `next-auth` removed Phase 19 |
| Content API | Bearer-protected ingest on Mirotech deploy |
| CI | **Broken** — workflow points to `brightline/brightline/` (wrong repo layout) |
| Unit tests | **42 passed** locally |
| Build | **Passed** locally after Phase 19 |
| Home LCP | ~**4.4 s** (Phase 15C/16) — separate deploy, ISR + perf pass shipped |

---

## 4. Studio status

| Surface | Result |
| --- | --- |
| Studio OS (`/studio`) | Tasks, finance, email — legacy modules |
| Studio ops (`/studio/ops`) | Control plane shell + tenant context |
| Content / Media / Publishing reads | Flag-gated; mostly empty when flags off |
| Activity / System | Metrics + health when deployed from platform branch |
| Navigation | Links to legacy admin editors (by design) |

---

## 5. Platform services status

| Service | Code | Prod flag (snapshot) | Notes |
| --- | --- | --- | --- |
| Tenants | ✅ | Foundation | Seeded slugs |
| Identity | ✅ | **ON** | SSO + PlatformUser bootstrap |
| Authorization | ✅ | With identity | Not on most admin mutations |
| Content | ✅ | OFF | Legacy Prisma CMS |
| Media | ✅ | OFF | Dual-path upload/sign |
| Assets | ✅ | OFF | Registry no-op |
| Publishing | ✅ | OFF | Legacy blog/hub sync |
| Jobs | ✅ | OFF | Sync fallback |
| Audit | ✅ | OFF | Writes skipped |
| Observability | Partial | Always-on health | Metrics need admin + flags |

---

## 6. Security status

| Area | Result |
| --- | --- |
| Tenant isolation | App-layer; membership checks on platform paths; **no Postgres RLS** |
| SSO | TTL, nonce, audience binding (unit tested) |
| RBAC | Studio ops + platform APIs; **not** Mission Control bulk APIs |
| Private media | Prefix blocks on public proxy; admin sign gated |
| Upload controls | MIME allowlist in `lib/truth/security.ts`; CSRF on operator APIs |
| Secrets | Env-only; threat model Phase 17 — no unauthenticated remote compromise path assumed |
| Residual HIGH | Binary admin pool, automation bearer scope, accountant edge gap, no durable audit when flag off |

Detail: [threat-model.md](../security/threat-model.md), [authz-current-state.md](./authz-current-state.md)

---

## 7. Performance status

| Site | Assessment |
| --- | --- |
| Brightline | Material LCP improvement on home/work post-15B/15C; home LCP still **> 2.5 s** target |
| Mirotech | Home LCP ~4.4 s; TTFB higher than Brightline (separate Vercel project) |
| Admin | Heavy R2/image-port bundles — operator UX priority |

---

## 8. Testing status

| Suite | Brightline (local 2026-08-29) | Mirotech (local) | CI (GitHub) |
| --- | --- | --- | --- |
| `npm run lint` | **FAIL** (64 errors, 158 warnings) | **FAIL** (13 errors) | Not reached — setup-node cache error |
| `npm run typecheck` | **FAIL** (7+ TS errors) | **FAIL** (fixtures/types) | Not reached |
| `npm test` | **PASS** 532 / 133 files | **PASS** 42 / 11 files | Not reached |
| `npm run build` | **PASS** | **PASS** (Phase 19) | Not reached |
| Playwright E2E | **Not run** (needs Postgres + `seed:delivery-smoke:empty`) | N/A in Brightline CI scope | Not reached |

**CI root cause:** `package-lock.json` **not committed** in `hopper911/brightline` repo; `actions/setup-node` cache path fails. Mirotech CI references non-existent `brightline/brightline/package-lock.json`.

---

## 9. Operations status

| Item | Result |
| --- | --- |
| CI workflows | Present but **failing** on recent pushes |
| Preview deploys | Vercel Git integration (branch previews exist on Neon) |
| Rollback | Vercel deployment history; documented in runbook — not exercised |
| Observability | `/api/platform/health`, admin metrics, optional Sentry |
| Alerts | Manual runbook — no automated paging |
| Runbook | [production-runbook.md](../operations/production-runbook.md) |
| Recovery docs | [PHASE-18](../operations/PHASE-18-recovery-validation-report.md), [neon-database-recovery.md](../operations/neon-database-recovery.md) |
| Neon PITR | **6 hours** on production project (Free-tier cap) |
| R2 backup | **No** versioning/cold backup in repo policy |

---

## 10. Remaining legacy (intentional)

From [legacy-retirement-plan.md](./legacy-retirement-plan.md). Each row: **reason · risk · retirement criteria**.

| Component | Reason retained | Risk | Future retirement |
| --- | --- | --- | --- |
| `lib/storage-r2.ts` canonical I/O | All R2 access | High if removed early | Never — foundation |
| Admin R2 manager + `/api/admin/r2/*` | Operational control plane | High | After Studio media parity + registry backfill |
| Dual-path upload/sign (6 routes) | `PLATFORM_MEDIA_ENABLED` off | Medium | Flag on ≥2 wk, zero regressions, remove legacy branch |
| Legacy blog/hub publish (`legacySync*`) | `PLATFORM_PUBLISHING_ENABLED` off | Medium | Same cutover evidence |
| Prisma CMS write routes | Authoritative editors | High | After ContentService cutover |
| `journal-ingest` + `hub-remote-write` | Publish domain layer (not shim) | High — owner | Keep |
| Admin HMAC cookie auth | Production login default | High | After SSO parity ≥4 wk |
| `ho1` handoff | Parallel Mirotech admin access | Medium | `LEGACY_ADMIN_HANDOFF_ENABLED=false` trial |
| `PlatformLegacyIdentityLink` | Bridge legacy → PlatformUser | Medium | Until all staff on PlatformUser |
| `portfolioImageLegacyReference` | Default read when asset read flag off | Medium | After backfill + `PLATFORM_ASSET_READ_ENABLED` |
| `next-auth` stub (Brightline) | `providers.tsx` + auth route | Low | Explicit removal program |
| `lib/truth/*` frozen locks | Security/chrome baseline | High if weakened | User-explicit change only |
| Google Sheet / upload-watcher | External ops pipeline | High | Separate ops program |
| Client delivery paths (gallery, package) | Separate from platform identity | High | Keep — ADR-009 |
| Unified monolith schema | Single Neon DB | Operational | No per-domain DB split planned |
| Mirotech `sharp` 0.33 vs Brightline 0.34 | Independent deploy | Low | Align on routine dep hygiene |

---

## 11. Known limitations

1. **Strangler flags mostly OFF** — platform services are additive, not production-default for media/content/publish/jobs/audit.
2. **Binary admin auth** on most Mission Control mutations — no per-operator RBAC enforcement.
3. **CI pipeline non-functional** — no automated gate on push until lockfile + workflow paths fixed.
4. **Lint/typecheck red** — build relies on `typescript.ignoreBuildErrors: true`.
5. **E2E coverage narrow** — one Playwright vertical (delivery package); no public/admin E2E in CI path today.
6. **Neon RPO ~6 h** — Free-tier PITR window; no off-site logical backup in repo.
7. **R2 is single store** — deletion is permanent; no documented cold backup.
8. **Platform audit off** — security/ops events may not persist to `platform_audit_events`.
9. **In-process metrics** — asset-read counters reset on cold start.
10. **Program branch not merged to `main`** — default branch may lag production Vercel target.
11. **Mirotech home LCP** ~4.4 s — above ideal marketing target.
12. **Vercel Hobby** — daily cron only; limited observability tier.

---

## 12. Critical blockers (if any)

| Blocker | Severity | Blocks production traffic? |
| --- | --- | --- |
| GitHub CI broken (no `package-lock.json` / wrong paths) | **High** for release **process** | **No** — Vercel builds independently today |
| Lint/typecheck failures | **Medium** — quality gate | **No** — masked in Next build |
| Incomplete platform flag cutover | **By design** — not a defect | **No** |
| 6h PITR + no R2 backup | **High** for **disaster recovery** | **No** for day-to-day |
| RBAC not on admin APIs | **High** for **security posture** | **No** — pre-existing operator model |

**No blocker** was found that would require immediate production rollback or that indicates active public site failure.

---

## 13. Recommended post-migration maintenance schedule

| Cadence | Action |
| --- | --- |
| **Each deploy** | Vercel build log green; spot-check `/api/platform/health` |
| **Weekly** | `GET /api/admin/platform/metrics`; review publishing job failures; Vercel usage (Hobby transfer budget) |
| **Monthly** | Lighthouse snapshot (`npm run perf:lighthouse`); `npm run deploy:check:env` on operator machine; review Neon PITR/plan |
| **Quarterly** | Threat-model review; legacy-retirement plan evidence update; accountant/admin access review |
| **Per flag cutover** | Enable one `PLATFORM_*` flag in staging → 2+ weeks prod with metrics → remove legacy branch per legacy plan |
| **Annual** | R2 cold-backup policy decision; Neon plan vs RPO requirements; dependency hygiene pass (Phase 19 pattern) |

**Immediate engineering follow-ups (post-gate, not Phase 20 scope):**

1. Commit `package-lock.json` (or fix CI to `npm install`) and repair Mirotech `ci.yml` working directory.
2. Fix typecheck errors or tighten TS without `ignoreBuildErrors`.
3. Merge `architecture/platform-foundation` → `main` when business approves production promotion path.
4. Establish R2 off-site backup policy (Phase 18 recommendation).

---

## Review category checklist (summary)

| # | Category | Gate result |
| --- | --- | --- |
| 1 | Public applications | **Pass** (production smoke) |
| 2 | Admin | **Pass with limitations** (RBAC partial) |
| 3 | Media | **Pass** (legacy path default) |
| 4 | Content | **Pass** (legacy CMS authoritative) |
| 5 | Publishing | **Pass** (legacy sync default) |
| 6 | Data | **Pass** (constraints documented) |
| 7 | Security | **Pass with limitations** (documented HIGH items) |
| 8 | Operations | **Fail** CI; **Pass** docs/runbook |
| 9 | Tests | **Partial** — unit/build green; lint/typecheck/E2E red/skipped |
| 10 | Legacy | **Documented** — see §10 |

---

*Phase 20 complete. Verification only — no code changes.*
