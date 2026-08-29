# Neon database recovery

**Brightline Photography** production Postgres  
**Last validated:** 2026-08-28 (safe checks only — no production mutations)

This document combines **what the repository configures** with **operator steps in the Neon Console**. It does not record connection strings, passwords, or project-specific retention until an operator completes the audit worksheet below.

**Related:** [production-runbook.md](./production-runbook.md), [deployment.md](../deployment.md)

---

## What this repo configures

| Item | Source |
| --- | --- |
| Runtime queries | `DATABASE_URL` — typically Neon **pooled** host (`-pooler` in hostname) |
| Migrations | `DIRECT_URL` — Neon **direct** (non-pooled) endpoint |
| Schema changes | `prisma migrate deploy` / `npm run deploy:prod` (migrate before Vercel deploy) |
| Optional | `PRISMA_DATABASE_URL` — Prisma Accelerate if enabled in Vercel |

Prisma datasource: `prisma/schema.prisma` (`url` + `directUrl`).

**Safe local check** (read-only status against URLs in `.env.production.local`):

```bash
npm run deploy:check:env
```

Expected when production is current: migrations in sync, both URLs set (values not printed).

---

## Neon capabilities (product — verify on your plan)

Neon is the managed Postgres provider referenced throughout deployment docs. Capabilities depend on **organization plan**, not this repository:

| Capability | Use for Brightline | Verify in console |
| --- | --- | --- |
| **Branches** | Instant copy-on-write clones; preview/staging; recovery validation | [Branching](https://neon.com/docs/introduction/branching) |
| **Instant restore / PITR** | Restore data state to a point in time via branch | [Branch restore](https://neon.com/docs/introduction/branch-restore) — **history window = plan limit** |
| **Scale to zero** | Idle compute suspend (cold-start on wake) | [Scale to zero](https://neon.com/docs/introduction/scale-to-zero) |
| **Read replicas** | Optional read-heavy workloads | [Read replicas](https://neon.com/docs/introduction/read-replicas) |
| **Logical replication** | External CDC / secondary copy (not configured in repo) | [Logical replication](https://neon.com/docs/guides/logical-replication-guide) |

**Not documented in this repo:** automated off-site backup to non-Neon storage, backup retention days, or Neon project/branch IDs.

---

## Operator audit worksheet (complete once per production project)

Fill this in from **Neon Console → your Brightline project** and store in your **private ops notes** (not in git):

| Field | Your value (private ops notes) |
| --- | --- |
| Neon organization | |
| Project name | |
| Project ID | |
| **Production branch** name | (often `main` or `production`) |
| Production branch ID | |
| Region | |
| Plan tier | |
| Instant restore / PITR window | (e.g. hours/days per plan) |
| Compute suspend timeout | |
| Vercel `DATABASE_URL` matches branch | yes / no |
| Vercel `DIRECT_URL` matches same branch (direct endpoint) | yes / no |
| Preview branches in use? | |
| Last `prisma migrate deploy` on prod (date) | |

**Audit steps:**

1. Log in to [Neon Console](https://console.neon.tech).
2. Open the project whose connection string is in Vercel Production `DATABASE_URL`.
3. **Branches** — note which branch production uses; list any preview/dev branches.
4. **Restore** or **Branch** UI — read your plan’s **restore window** (do not assume a number).
5. **Settings** — plan, region, IP allow list if used.
6. Cross-check Vercel → Project → Environment Variables → Production (`DATABASE_URL`, `DIRECT_URL`, optional `DATABASE_URL_UNPOOLED`).
7. Run `npm run deploy:check:env` locally with pulled prod env to confirm migrate status.

**Neon MCP / CLI (optional):** Authenticate Neon in Cursor or run `neon projects list` / `neon branches list` to capture IDs without pasting secrets into tickets.

---

## Recovery scenarios

### A. Application bug after good migration (schema OK, bad code)

1. **Vercel promote** previous deployment — does not roll back DB ([production-runbook.md](./production-runbook.md)).
2. Disable platform flags if needed (`PLATFORM_*`).
3. No Neon action unless app wrote bad data.

### B. Bad migration applied (schema wrong, app broken)

1. **Stop** further deploys and migrations.
2. Assess whether forward-fix migration is safer than restore.
3. If restore required:
   - Neon Console → create **branch from point in time** before migration (within plan window), **or** restore branch per Neon UI.
   - Validate branch: `npx prisma migrate status` against branch URLs in a maintenance shell.
   - Smoke-test admin login and critical read paths.
   - Update Vercel Production `DATABASE_URL` and `DIRECT_URL` to the recovered branch endpoints (**maintenance window**).
   - Redeploy or wait for env propagation; verify `GET /api/platform/health` when route is live.

### C. Data corruption / accidental destructive SQL

Same as B — PITR branch or instant restore within plan window. **Do not** `prisma migrate reset` on production.

### D. Neon platform outage

1. [Neon status](https://status.neon.tech).
2. Vercel will show database errors on health checks.
3. Wait for provider recovery; no repo-automated failover to another region.

### E. Connection / pooler errors only

1. Try direct endpoint for diagnostics (`DIRECT_URL`).
2. Check compute suspended (scale-to-zero cold start).
3. Check connection limit / pool size in Neon metrics.

---

## Connection swap procedure (after recovered branch)

**Requires explicit operator approval and maintenance window.**

1. Record current production branch and endpoints (worksheet above).
2. Create or validate recovery branch data.
3. In Vercel Production, update:
   - `DATABASE_URL` (pooled)
   - `DIRECT_URL` (direct)
   - `PRISMA_DATABASE_URL` if used
4. Redeploy production or trigger env refresh per Vercel behavior.
5. Run `npm run deploy:check:env` with new URLs — confirm migrate status.
6. Smoke: admin login, public home, one gallery read.
7. Document incident; keep old branch until retention policy allows deletion.

**Never commit** production URLs to git.

---

## Prohibited on production (without approval)

- `prisma migrate reset`
- `prisma db push`
- Manual `DROP TABLE` / mass `DELETE` without backup
- Pointing preview branch URL at production Vercel env by mistake

---

## Validation log (safe, no mutations)

| Date | Check | Result |
| --- | --- | --- |
| 2026-08-28 | `npm run deploy:check:env` | DB URLs set; **66 migrations; in sync**; branch `architecture/platform-foundation` |
| 2026-08-28 | `GET https://brightlinephotography.com/api/platform/health` | **404** — platform routes not on current production deployment (pre–`platform-foundation` promote) |
| 2026-08-28 | Neon MCP in Cursor | **Not authenticated** — project-specific audit deferred to console worksheet |
| 2026-08-29 | Phase 18 recovery validation | Safe checks + `neonctl`: Brightline project `sparkling-shadow-45459849`, PITR **6h**, branches listed; no production rollback or restore |

---

## Remaining follow-ups (from Phase 12C)

| Item | Status | Owner action |
| --- | --- | --- |
| Complete Neon audit worksheet | **Open** | Operator fills private ops notes from console |
| Promote `architecture/platform-foundation` to production | **Open** | Gated `deploy:prod` after merge/branch override — **not done in validation** |
| R2 export for critical prefixes | **Open** | No automation in repo; operator policy |
| Uptime monitor on `/api/platform/health` | **Blocked** | Route 404 until foundation deploy promoted |
| More frequent job drain | **Open** | Hobby cron daily; increase only if async publishing is critical path |
