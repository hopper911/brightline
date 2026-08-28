# PHASE 12C — Operations & Disaster Recovery Report

**Date:** 2026-08-28  
**Branch:** `architecture/platform-foundation`  
**Deliverable:** `docs/operations/production-runbook.md`  
**Policy:** Documentation and safe validation only — no production changes in this phase.

---

## Safe validation performed

| Check | Result |
| --- | --- |
| `npm run deploy:check:env` | Warnings: dirty tree, branch not `main`; DB URLs present; **66 migrations; database reports in sync** |
| `GET https://brightlinephotography.com/api/platform/health` | **404** on current production deploy — platform routes not yet on live production assignment (expected until foundation branch promoted) |

No intentional production mutations, flag changes, or cron invocations were run.

---

## 1. Failure modes documented

Procedures added in [production-runbook.md](../operations/production-runbook.md):

| Scenario | Recovery summary |
| --- | --- |
| Brightline deployment failure | Vercel logs → fix → preview → promote / `deploy:prod` |
| MiroTech deployment failure | Mirotech Vercel rollback; verify Content API + handoff env on Brightline |
| Database unavailable | Neon status + connection strings; migrate status before redeploy |
| R2 unavailable | Cloudflare status + env tokens; verify keys; no secondary backup |
| Job provider unavailable | `PLATFORM_JOBS_ENABLED`, `CRON_SECRET`, daily cron; manual cron GET; flag off → legacy sync |
| SSO failure | Match secrets on both deploys; handoff fallback |
| Publishing failure | Flag rollback; Mirotech API; inspect `platform_jobs` |
| Bad deployment release | Vercel promote previous deployment; flag rollback; forward-fix migrations only |

Cross-reference: [alerting.md](../operations/alerting.md) for operational signals.

---

## 2. Rollback procedures

| Layer | Procedure |
| --- | --- |
| **Application** | Vercel Dashboard → Promote previous production deployment |
| **Git** | Deploy known commit via gated `npm run deploy:prod` from clean checkout |
| **Feature flags** | Set `PLATFORM_*` to `false` or remove; `LEGACY_ADMIN_HANDOFF_ENABLED=true` for handoff |
| **Publishing** | `PLATFORM_PUBLISHING_ENABLED=false` — no data migration ([publishing-cutover-runbook.md](./publishing-cutover-runbook.md)) |
| **Database** | **No automated down-migration** — forward-fix or Neon console recovery with approval |
| **CMS content** | Admin toggles (Design hidden, resume disabled) without deploy |

---

## 3. Database recovery

**Configured in repo:**

- Neon Postgres via `DATABASE_URL` (pooled) + `DIRECT_URL` (migrations) in `prisma/schema.prisma`
- Schema applied with `prisma migrate deploy` / `npm run deploy:prod`
- 66 versioned migrations; local check reported **in sync** with production connection in `.env.production.local`

**Not configured or documented in repo:**

- Neon project identity, region, plan tier
- PITR retention, backup schedule, branch naming for prod/preview
- Automated restore runbooks in CI

**Operator path:** Neon Dashboard → verify available restore/branch features on **actual plan** → restore to new branch or PITR if offered → validate → update Vercel `DATABASE_URL`/`DIRECT_URL` during maintenance window.

**Prohibited without approval:** `migrate reset`, `db push`, destructive DDL on production.

---

## 4. Media recovery

| Item | Status |
| --- | --- |
| Primary store | Cloudflare R2 — Brightline + Mirotech buckets |
| Registry | `platform_assets` (optional `PortfolioImage.assetId` link) |
| Secondary backup in codebase | **None** — no replication/lifecycle export jobs |
| R2 delete tools | Operator scripts (`tools/delete-from-r2.mjs`, etc.) — manual |

**Recovery:** R2 dashboard object check → re-upload from operator exports if bytes lost → `npm run assets:backfill` to re-register.

Deleting `platform_assets` rows does not remove R2 objects; deleting R2 objects does not auto-clean CMS keys.

---

## 5. Environment recovery

**Where configured:** Vercel Project → Environment Variables; local gitignored `.env*`; template [.env.example](../.env.example).

**Critical groups documented in runbook (names only):**

- Database: `DATABASE_URL`, `DIRECT_URL`, `PRISMA_DATABASE_URL`
- Admin: `ADMIN_ACCESS_CODE`, `ADMIN_SESSION_SECRET`
- R2 Brightline: `R2_*`, `NEXT_PUBLIC_R2_*`
- R2 Mirotech: `MIROTECH_R2_*`
- Dual-brand: `MIROTECH_CONTENT_API_URL`, `CONTENT_API_SECRET`, `MIROTECH_SITE_URL`, `MIROTECH_ADMIN_HANDOFF_SECRET`
- Platform flags: `PLATFORM_*`, `LEGACY_ADMIN_HANDOFF_ENABLED`, `PLATFORM_SSO_EXCHANGE_SECRET`
- Cron: `CRON_SECRET`
- Accountant: `ACCOUNTANT_SESSION_SECRET`
- Optional: `UPSTASH_*`, `SENTRY_*`

**Leak response:** rotate at provider → update Vercel → redeploy → revoke old credentials.

---

## 6. Missing recovery capability

| Gap | Impact |
| --- | --- |
| **No documented Neon PITR/backup procedure in repo** | DB restore depends on Neon console features not captured here |
| **No secondary R2 backup** | Object loss requires external exports |
| **No automated migration rollback** | Bad DDL requires forward fix or Neon restore |
| **Platform health route not on current prod** | `/api/platform/health` 404 until foundation deploy promoted |
| **Vercel Hobby cron granularity** | Platform jobs drain once daily — backlog during outages |
| **Mirotech app not in this repo** | Mirotech recovery is separate Vercel project |
| **SSO nonce / job rows** | No FK cleanup for orphaned `platform_sso_exchange_nonces.userId` |
| **Google Sheet pipeline** | Apps Script webhook — separate from Vercel runbook |

---

## 7. Recommended future improvements

| Priority | Improvement |
| --- | --- |
| High | Document Neon project ID, plan, and **verified** PITR/branch restore steps in runbook after console audit |
| High | Promote `architecture/platform-foundation` to production or merge to release branch so health/metrics routes exist |
| Medium | Scheduled R2 inventory export or cross-region replication for critical prefixes (galleries, `accounting/`) |
| Medium | External uptime monitor on `/api/platform/health` once route is live |
| Medium | Neon dev/preview branch strategy documented and wired to Vercel preview env |
| Low | Partial index on `platform_jobs(status, createdAt)` when job volume grows (see Phase 12B) |
| Low | Vercel paid tier or external cron for more frequent job drain if async publishing becomes critical path |
| Low | Sentry alerts wired to email/Slack when `SENTRY_DSN` is set |

---

## Summary

Phase 12C produced a single **production runbook** covering Vercel, Neon, R2, authentication surfaces, in-process job provider, publishing flags, and environment variable **names** without recording secrets. Rollback is primarily **Vercel deployment promotion** and **platform feature flags**; database and media recovery depend on **Neon console** and **R2 durability** respectively, with **no secondary media backup** defined in this repository.
