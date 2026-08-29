# PHASE 14A — Deployment Safety Report

**Date:** 2026-08-29  
**Branch:** `architecture/platform-foundation`  
**Policy:** Improve validation around existing Vercel + GitHub + Neon model—no deployment infrastructure redesign.

---

## 1. Current deployment flow

| Stage | Actual behavior |
| --- | --- |
| **PR** | GitHub `ci.yml` (lint, typecheck, tests, migration diff scan, env template, e2e, build) |
| **Preview** | Vercel Git integration (when project linked)—uses Preview env vars |
| **Merge** | Typically `main` or program branch |
| **Migrate** | `deploy.yml` on push to `main` **or** `npm run deploy:prod` **or** manual `prod-migrate.yml` |
| **Production app** | Vercel auto-deploy from Git **or** `vercel deploy --prod` via `deploy-prod.sh` |
| **Mirotech** | Separate Vercel project—not deployed from Brightline workflows |

Vercel build runs `prisma generate` + Next build; **does not** apply migrations.

---

## 2. CI checks

**Enhanced `ci.yml`:**

- `npm run lint`
- `npm run typecheck` (new script)
- `npm test`
- `node scripts/check-migration-safety.mjs --diff-only`
- `node scripts/validate-server-env.mjs --ci`
- Playwright e2e + `npm run build` (dummy DB URLs)

Branches: `main`, `work-v2`, `architecture/platform-foundation`.

No `continue-on-error` on required jobs.

---

## 3. Database migration protection

**New:** `scripts/check-migration-safety.mjs`

- **Blocks CI:** `DROP TABLE`, `TRUNCATE` in **new** migration SQL not already on the PR base branch
- **Warns:** `DROP COLUMN`, `ALTER COLUMN TYPE`, `DROP INDEX`, `DROP CONSTRAINT`
- Uses two-dot `git diff base HEAD` (not three-dot) so long-lived branches do not re-flag migrations already on `main`

**Fixed:** `deploy.yml` now uses `DIRECT_URL` secret (fallback to `DATABASE_URL` expression).

---

## 4. Environment validation

**New:**

- `lib/env/server-env.ts` — categorized specs, `validateServerEnv()` (no value logging)
- `scripts/validate-server-env.mjs` — local / `--ci` / `--example` modes
- `lib/env/server-env.test.ts`

Categories: required runtime, required production, optional migration flags, public `NEXT_PUBLIC_*`. Migration flags **never** required.

---

## 5. Preview safety

**Documented risks** in [deployment.md](../operations/deployment.md):

- Preview must not use production `DATABASE_URL`, Resend, R2, or Mirotech publish endpoints unless intentional
- No code change to Vercel env wiring in this phase—infrastructure review required if Preview shares Production secrets

---

## 6. Production release flow

**Recommended:** feature branch → PR → green CI + preview → merge → production deploy.

**Human gate:** PR merge (branch protection if enabled).

**Not automatic in repo:** Vercel production promotion after `deploy.yml`—operator or Vercel Git integration handles app deploy separately from `deploy.yml` build job.

---

## 7. Rollback behavior

Documented in [deployment.md](../operations/deployment.md) and [production-runbook.md](../operations/production-runbook.md):

- Vercel deployment promote
- `PLATFORM_*` flag rollback
- DB: forward migration or Neon restore—no down-migration automation

---

## 8. Security protections

- CI workflows do not print `DATABASE_URL` or other secrets
- `check-prod-deploy-ready.mjs` suppresses Prisma status stdout
- Env validator prints **names only**
- GitHub secrets for Actions migrate jobs

---

## 9. Files created/modified

| File | Change |
| --- | --- |
| `docs/operations/deployment.md` | **Created** — CI/CD reference |
| `docs/architecture/PHASE-14A-deployment-safety-report.md` | **Created** — this report |
| `.github/workflows/ci.yml` | Lint, typecheck, migration scan, env CI, branch list |
| `.github/workflows/deploy.yml` | `DIRECT_URL` secret fix |
| `scripts/check-migration-safety.mjs` | **Created** |
| `scripts/validate-server-env.mjs` | **Created** |
| `lib/env/server-env.ts` | **Created** |
| `lib/env/server-env.test.ts` | **Created** |
| `package.json` | `typecheck`, `check:migrations`, `check:env` scripts |

---

## 10. Runtime production behavior changed

**No.** No changes to production runtime, Vercel project settings, or env values. Validation is CI/local scripts + optional `validateServerEnv()` library for future boot checks.

---

## 11. Risks still requiring attention

| Risk | Notes |
| --- | --- |
| **Duplicate production migrate** | `deploy.yml` on `main` push + `deploy:prod` CLI both run `migrate deploy` |
| **Preview → production resources** | Must verify Vercel Preview env isolation in dashboard |
| **CI branch list vs production branch** | Production may track `studio-os-cms-production-*` while CI watches `main` |
| **`deploy.yml` does not deploy** | Team may assume push to main ships app—Vercel Git link required |
| **Mirotech pipeline** | Not covered by Brightline `ci.yml` |
| **Branch protection** | Not enforced in repo—configure on GitHub if merge gate desired |
| **Historical destructive migrations** | Flagged by `--all` audit only |

---

## 12. Recommended Phase 14B

| Item | Goal |
| --- | --- |
| GitHub branch protection | Require `ci.yml` success before merge |
| Neon preview branch | Wire Vercel Preview `DATABASE_URL` to Neon branch |
| Consolidate migrate path | Single owner: `deploy.yml` **or** `deploy:prod` only |
| Mirotech CI parity | Mirror static checks on Mirotech repo |
| Production env boot check | Call `validateServerEnv()` on server start in production |
| Staging Mirotech API URL | Preview env for `MIROTECH_CONTENT_API_URL` |

---

## Summary

Phase 14A adds PR-time **lint, typecheck, migration safety (diff-only), and env template validation** without redesigning Vercel deployment. Brightline and Mirotech remain independently deployable. Production runtime unchanged; documentation and CI hardening only.
