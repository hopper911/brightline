# Deployment and CI/CD

**Brightline Photography** (`brightlinephotography.com`)  
**Related:** Mirotech (`mirotech.solutions`) — **separate Vercel project**, independently deployable  
**Last updated:** 2026-08-29 (Phase 14A)

This document describes the **actual** release pipeline. It does not replace infrastructure; it documents and hardens validation around the existing Vercel + GitHub + Neon model.

**See also:** [docs/deployment.md](../deployment.md) (migrate-first CLI), [production-runbook.md](./production-runbook.md) (rollback/DR).

---

## Target release flow

```
Feature branch
    → Pull request
    → GitHub Actions (lint, typecheck, tests, build, migration scan)
    → Vercel preview deployment (Git integration)
    → Human review
    → Merge to production branch
    → Production migration + Vercel production deploy (operator or automation)
```

Mirotech follows the same pattern on its own Vercel project and GitHub repo/branch policy.

---

## Branch strategy

| Branch | Typical use |
| --- | --- |
| `main` | Production release target (GitHub Actions `deploy.yml` on push) |
| `architecture/platform-foundation` | Platform program branch (CI enabled) |
| `work-v2` | Legacy CI branch |
| `studio-os-cms-production-*` | Historical production branch (`REQUIRED_GIT_BRANCH` in deploy scripts) |
| Feature branches | PR → preview → merge |

**Brightline production deploy script** defaults to `main` unless `REQUIRED_GIT_BRANCH` is set.

---

## Vercel configuration

| Item | Value |
| --- | --- |
| Config file | `vercel.json` — crons, redirects |
| Build | `npm run build` (`prisma generate && next build --webpack`) |
| Node | 20.x (`package.json` engines) |
| Crons | `/api/cron/followups` (14:00 UTC), `/api/cron/platform-jobs` (15:30 UTC) |
| Production domain | `brightlinephotography.com` |

**Preview deployments:** Created by Vercel Git integration on pull requests when the project is linked. Preview uses Vercel **Preview** environment variables—not Production secrets unless misconfigured.

**Build caching:** `npm ci` + GitHub Actions `cache: npm`; Vercel build cache on platform side.

---

## GitHub Actions

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| **`ci.yml`** | PR + push to `main`, `work-v2`, `architecture/platform-foundation` | Lint, typecheck, unit tests, migration safety (diff), env template, e2e, production build |
| **`deploy.yml`** | Push to `main` | `prisma migrate deploy` + `npm run build` against GitHub secrets |
| **`prod-migrate.yml`** | Manual `workflow_dispatch` | Production migrate only (uses `DIRECT_URL` secret) |
| **`npm-audit.yml`** | Weekly + manual | `npm audit --audit-level=high` |

**CI does not deploy to Vercel.** Vercel deploys via Git hook or `vercel deploy` CLI.

**No `continue-on-error`** on required CI jobs. Failures block merge unless branch protection is not configured.

---

## Pull request checks

Every meaningful PR should pass:

| Check | Command / workflow step |
| --- | --- |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Unit tests | `npm test` |
| Integration / e2e | Playwright job (postgres service) |
| Production build | `npm run build` with dummy `DATABASE_URL` |
| Migration safety | `npm run check:migrations` (changed SQL only) |
| Env template | `npm run check:env:ci` |

Local equivalents:

```bash
npm run lint && npm run typecheck && npm test && npm run build
npm run check:migrations
npm run check:env:ci
```

---

## Database migration safety

Script: `scripts/check-migration-safety.mjs`

| Severity | Patterns | CI behavior |
| --- | --- | --- |
| **Blocking** | `DROP TABLE`, `TRUNCATE` | Fails CI for **changed** migrations in PR |
| **Warning** | `DROP COLUMN`, `ALTER COLUMN … TYPE`, `DROP INDEX`, `DROP CONSTRAINT` | Logged; does not fail |

Full history audit (local): `npm run check:migrations:all`

**Not used in production:** `prisma db push`

---

## When `prisma migrate deploy` runs

| Path | When | Notes |
| --- | --- | --- |
| **`npm run deploy:prod`** | Operator CLI, before `vercel deploy --prod` | Canonical gated flow |
| **GitHub `deploy.yml`** | Every push to `main` | Migrate + build; **does not deploy Vercel** |
| **GitHub `prod-migrate.yml`** | Manual dispatch | Migrate only |
| **CI e2e job** | Ephemeral Postgres | `migrate deploy` on CI DB only |
| **Vercel build** | Production/preview build | **Does not** run migrations |

**Risk:** `deploy.yml` + `deploy:prod` can both migrate production on the same merge if both run—`migrate deploy` is idempotent but redundant. Prefer **one** operator path: either rely on `deploy.yml` then Vercel auto-deploy, **or** `deploy:prod` only—document team choice.

**Never:** `prisma migrate reset` or `db push` against production.

---

## Environment validation

Module: `lib/env/server-env.ts`  
Scripts: `scripts/validate-server-env.mjs`

| Category | Examples | Required in CI? |
| --- | --- | --- |
| **Required runtime** | `DATABASE_URL`, `DIRECT_URL` | Dummy URLs in build |
| **Required production** | `ADMIN_SESSION_SECRET`, `R2_*`, `NEXT_PUBLIC_SITE_URL` | Not in CI (no secrets) |
| **Optional migration flags** | `PLATFORM_*`, `LEGACY_ADMIN_HANDOFF_ENABLED` | Never required |
| **Public `NEXT_PUBLIC_*`** | Site URL, R2 public URL, Turnstile site key | Documented in `.env.example` |

Validation **never logs values**. Production boot can call `validateServerEnv()` for fail-fast (optional).

Configure secrets in **Vercel → Settings → Environment Variables** (Production / Preview / Development separately).

---

## Preview deployment safety

| Risk | Mitigation |
| --- | --- |
| Preview uses **production DATABASE_URL** | **Misconfiguration** — use Neon branch or dev DB for Preview env in Vercel |
| Preview sends **production email** | Use Resend test mode or omit `RESEND_API_KEY` on Preview |
| Preview writes **production R2** | Point Preview `R2_*` to dev bucket or restrict keys |
| Preview triggers **production publishing** | Mirotech API URLs should be staging or disabled on Preview |
| Cron on preview | Vercel cron runs on production deployment only |

**Document team policy:** Preview env vars must not point at production mutation targets without explicit approval.

---

## Production release flow

**Recommended:**

1. PR with green CI + Vercel preview smoke test  
2. Human review + merge to `main`  
3. **Either** Vercel auto-deploy from `main` **or** `npm run deploy:prod` (migrate + `vercel deploy --prod`)  
4. Post-deploy: public site, admin login, optional `/api/platform/health` when deployed  

**Human approval:** Merge to `main` is the approval gate. No separate deploy approval UI unless you add GitHub Environments protection on `prod-migrate.yml`.

**Mirotech:** Independent merge + deploy on Mirotech Vercel project; verify shared secrets (`PLATFORM_SSO_EXCHANGE_SECRET`, handoff) stay aligned.

---

## Rollback

| Layer | Action |
| --- | --- |
| **Application** | Vercel → Promote previous production deployment |
| **Feature flags** | Set `PLATFORM_*` false in Vercel Production env |
| **Database** | **No automated down-migration** — forward-fix or Neon restore ([neon-database-recovery.md](./neon-database-recovery.md)) |

Code rollback **does not** roll back schema.

---

## CI security

| Rule | Implementation |
| --- | --- |
| No secrets in logs | `check-prod-deploy-ready.mjs` hides URLs; env validator prints names only |
| GitHub secrets | `DATABASE_URL`, `DIRECT_URL` in Actions secrets / environments |
| No `echo $DATABASE_URL` in workflows | Workflows pass secrets via `env:` only |
| npm audit | Weekly high-severity scan |

---

## NPM scripts (deployment-related)

| Script | Purpose |
| --- | --- |
| `deploy:prod` | Gated migrate + Vercel production |
| `deploy:check` / `deploy:check:env` | Pre-flight checklist |
| `check:migrations` | PR migration safety (diff-only) |
| `check:env:ci` | Template + structural CI check |
| `typecheck` | `tsc --noEmit` |

---

## Mirotech independence

- Separate Vercel project and deploy pipeline  
- Brightline does not deploy Mirotech from this repo’s workflows  
- Shared **secrets** for cross-admin (handoff, SSO) must be updated on **both** projects when rotated  

---

## Related documents

| Doc | Topic |
| --- | --- |
| [PHASE-14A-deployment-safety-report.md](../architecture/PHASE-14A-deployment-safety-report.md) | Phase 14A deliverable |
| [deployment.md](../deployment.md) | CLI migrate-first workflow |
| [production-runbook.md](./production-runbook.md) | Incident / rollback |
