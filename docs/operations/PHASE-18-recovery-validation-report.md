# RECOVERY VALIDATION REPORT — PHASE 18

**Project:** Brightline Photography ↔ MiroTech Solutions  
**Date:** 2026-08-29  
**Policy:** Safe validation only — **no production rollback, no destructive disaster tests, no secret export**

**Related:** [production-runbook.md](./production-runbook.md), [neon-database-recovery.md](./neon-database-recovery.md), [PHASE-12C-operations-report.md](../architecture/PHASE-12C-operations-report.md)

---

## 1. Database recoverability

### What the application configures

| Item | Verified state |
| --- | --- |
| Runtime connection | `DATABASE_URL` — Neon **pooled** host (`*-pooler.*.neon.tech`) |
| Migrations | `DIRECT_URL` — Neon **direct** (non-pooled) host on same compute endpoint |
| Schema | 66 Prisma migrations; `npm run deploy:check:env` reports **in sync** with production URLs (2026-08-29) |
| Prisma Accelerate | **Not configured** (`PRISMA_DATABASE_URL` unset in pulled production env) |
| Production compute endpoint (hostname only) | `ep-icy-field-ahhobt3q` · region `us-east-1` (`c-3.us-east-1.aws.neon.tech`) |
| Database name | `neondb` |

### Neon product capabilities (verify plan in console — do not assume)

Neon provides **branching**, **instant restore / PITR** (history window on root branches), and **manual snapshots** on all projects. **Retention depends on plan tier**, not this repository:

| Plan (Neon docs) | Instant restore / PITR window | Notes |
| --- | --- | --- |
| **Free** | Max **6 hours**, capped at **1 GB** change history | Cannot extend on Free |
| **Launch** | Default 1 day, max **7 days** | History billed $0.20/GB-month |
| **Scale** | Default 1 day, max **30 days** | History billed $0.20/GB-month |

Sources: [Neon history window](https://neon.com/docs/introduction/history-window), [Neon plans](https://neon.com/docs/introduction/plans).

### What was **not** verified in this phase (updated 2026-08-29)

| Item | Status |
| --- | --- |
| Neon **organization plan tier** for production project | **Inferred Free** from `history_retention_seconds: 21600` (6h) via `neonctl` — confirm billing in console |
| **history_retention_seconds** / Instant restore slider | **21600 s (6 hours)** on project `sparkling-shadow-45459849` (`brightline`, `aws-us-east-1`) |
| Branch inventory | **Verified via neonctl** — see below |
| Mirotech production Postgres | **Separate project** `damp-frog-09966647` (`aws-us-east-2`) — not shared with Brightline |
| Off-site logical backup (pg_dump cron, etc.) | **None in codebase** |

### Neon project state (neonctl — 2026-08-29, no secrets)

| Project | ID | Region | PITR window (`history_retention_seconds`) |
| --- | --- | --- | --- |
| **brightline** (production DB) | `sparkling-shadow-45459849` | `aws-us-east-1` | **21600 (6 hours)** |
| Other (`damp-frog-09966647`) | `damp-frog-09966647` | `aws-us-east-2` | Not fetched in this pass |

**Brightline branches (root = production):**

| Branch name | State | Notes |
| --- | --- | --- |
| `production` | ready | Root branch — PITR applies here |
| `vercel-dev` | ready | Child of production |
| `preview/architecture/platform-foundation` | ready | Preview branch |
| `preview/studio-os-cms-production-20260425` | ready | Preview branch |
| `preview/main`, `preview/visual-prototype`, `preview/work-v2` | archived | Historical previews |

Production Vercel `DATABASE_URL` endpoint `ep-icy-field-ahhobt3q` matches project region `c-3.us-east-1.aws.neon.tech`.

### Recovery procedures documented vs real

| Procedure | Documented? | Executable today? |
| --- | --- | --- |
| Read-only migrate status | Yes | **Yes** — `npm run deploy:check:env` |
| PITR / branch-from-time | Yes ([neon-database-recovery.md](./neon-database-recovery.md)) | **Yes in Neon Console** — within plan window, operator approval required |
| Vercel env connection swap after restore | Yes | **Yes** — update `DATABASE_URL` + `DIRECT_URL`, redeploy |
| `prisma migrate reset` on production | Prohibited | — |

---

## 2. Media recoverability

### R2 buckets (Cloudflare API — 2026-08-29)

| Bucket | Created | Location | Notes |
| --- | --- | --- | --- |
| `brightline-main` | 2026-02-04 | ENAM | Primary Brightline media (per ops docs) |
| `brightline-images` | 2026-01-28 | — | Legacy / additional |
| `mirotech` | 2026-08-05 | — | Mirotech site vault |
| `studio` | 2026-03-17 | — | Studio-related storage |

### Versioning, deletion recovery, backup, lifecycle

| Capability | Actual state |
| --- | --- |
| **Object versioning** | **Not available** as a practical recovery mechanism — R2 does not offer S3-style versioning for rollback of overwritten/deleted objects (community/docs consensus; not enabled on listed buckets via API metadata) |
| **Deletion recovery** | **No soft-delete** — admin `r2/delete` and dashboard delete are **permanent** at application level |
| **Separate backup / replication** | **None in codebase** — no cross-bucket replication, no export-to-GCS/S3 jobs, no lifecycle export |
| **Lifecycle policies** | **Not configured** in repo; R2 supports expiration / IA transition / multipart abort rules — **operator must verify in Cloudflare dashboard** per bucket |
| **Registry vs bytes** | `platform_assets` and CMS `storageKey` fields reference keys — **DB cannot reconstruct lost objects** |

### Operational gap (major)

**Production media has no automated secondary backup.** Recovery path today:

1. Object still in R2 → serve via signed URL / re-register in CMS.
2. Object deleted from R2 → **restore from operator Lightroom/exports** or accept permanent loss.
3. Re-register surviving keys → `npm run assets:backfill` ([asset-backfill-runbook.md](../architecture/asset-backfill-runbook.md)).

Client private prefixes (`client-galleries/`, `delivery/`, `accounting/`) share the same R2 durability model — **no versioning backup**.

---

## 3. Deployment rollback

### Brightline (`hopper911s-projects/brightline`)

| Check | Result (2026-08-29) |
| --- | --- |
| Production deployments listable | **Yes** — `vercel ls brightline --prod` |
| Current production alias | `https://brightlinephotography.com` → recent Ready deployments |
| Prior good deployment identifiable | **Yes** — e.g. `dpl_953aNC6yAYT2h2aaVRew5QE2Pyxo` (`brightline-9rb27yev6`, ~23h older than latest) with production aliases |
| Inspect without promote | **Yes** — `vercel inspect <deployment-url>` returned id, status Ready, alias list |
| Promote command available | **Yes** — Vercel Dashboard “Promote” or CLI; **not executed in this phase** |

Failed production builds also visible in history (e.g. same-day Error deployments) — rollback target should be last **Ready** deployment, not last attempted build.

### MiroTech (`hopper911s-projects/mirotech-solutions`)

| Check | Result |
| --- | --- |
| Production deployments listable | **Yes** |
| Prior Ready deployment | e.g. `mirotech-solutions-q6hwxgfxk` (~10m before latest) |
| Alias | `https://mirotech.solutions` |
| Rollback performed | **No** |

### Limitation

Vercel rollback **does not roll back database schema or R2 objects**. Bad migration + good app rollback leaves schema/code mismatch — see [production-runbook.md](./production-runbook.md).

---

## 4. Environment recoverability

### Documentation sources (names only — no values)

| Source | Coverage |
| --- | --- |
| [.env.example](../../.env.example) | Full developer template |
| [production-runbook.md](./production-runbook.md) § Environment recovery | Critical + dual-brand + platform + optional |
| [DEPLOY.md](../../DEPLOY.md) | Deploy troubleshooting |
| `npm run deploy:check:env` | Verifies `DATABASE_URL` + `DIRECT_URL` **presence** (not values) |

### Critical variable names (production)

**Database:** `DATABASE_URL`, `DIRECT_URL`, optional `PRISMA_DATABASE_URL`  
**Admin:** `ADMIN_ACCESS_CODE`, `ADMIN_SESSION_SECRET`  
**Brightline R2:** `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`, `R2_PUBLIC_URL`, `NEXT_PUBLIC_R2_PUBLIC_URL`  
**Site:** `NEXT_PUBLIC_SITE_URL`  
**Mirotech integration:** `MIROTECH_R2_*`, `MIROTECH_CONTENT_API_URL`, `CONTENT_API_SECRET`, `MIROTECH_SITE_URL`, `MIROTECH_ADMIN_HANDOFF_SECRET`  
**Platform:** `PLATFORM_*` flags, `PLATFORM_SSO_EXCHANGE_SECRET`, `LEGACY_ADMIN_HANDOFF_ENABLED`, `CRON_SECRET`  
**Accountant:** `ACCOUNTANT_SESSION_SECRET` (+ portal user records in DB)  
**Automation:** `AUTOMATION_API_SECRET`, `BL_INTERNAL_API_TOKEN`  
**Email / contact:** `RESEND_*`, `TURNSTILE_*`, `CRON_SECRET`  
**Optional:** `UPSTASH_REDIS_*`, `SENTRY_DSN`, vendor AI keys (`OPENAI_API_KEY`, `FAL_KEY`, etc.)

### Recovery after secret leak

Rotate at provider → update Vercel Production (and Mirotech project where shared) → redeploy → revoke old credentials. Documented in runbook; **not exercised in this phase**.

### Config hygiene finding

Local `.env` uses pooled host `ep-late-bird-…` while `.env.production.local` uses `ep-icy-field-…`. Local `DIRECT_URL` points at **production** direct endpoint — **risk of running migrations against production while app reads dev branch**. Operators should align branch endpoints before migrate operations.

---

## 5. Restore validation performed

| Test | Environment | Result |
| --- | --- | --- |
| `npm run deploy:check:env` | Production URLs from `.env.production.local` | **Pass** — 66 migrations, DB in sync; values not printed |
| `vercel ls --prod` + `vercel inspect` | Brightline + Mirotech production | **Pass** — rollback targets identified; no promote |
| Cloudflare `r2_buckets_list` | Account API | **Pass** — four buckets listed |
| Neon branch / PITR restore | — | **Not performed** — `neonctl` listed project `sparkling-shadow-45459849` + branches; PITR window **6h** confirmed |
| Neon dev branch migrate status | Local `.env` | **Failed** — invalid `DATABASE_URL` scheme in local `.env` (config issue on validation machine) |
| Production rollback | — | **Intentionally skipped** |

---

## 6. Major recovery gaps

1. **No automated R2 backup or object versioning** — accidental delete or overwrite is likely **permanent**.
2. **Neon PITR window confirmed at 6 hours** on Brightline project — aligns with **Free-plan cap**; RPO beyond 6h requires plan upgrade + longer `history_retention_seconds`.
3. **No off-site database backup job** in repo — reliance on Neon-native history/snapshots only.
4. **Application rollback independent of DB/R2** — schema drift and content loss remain after Vercel promote.
5. **Platform health / jobs** — async publishing recovery depends on flags + cron; Hobby cron is daily ([vercel-hobby-usage](../../.cursor/rules/vercel-hobby-usage.mdc)).
6. **Dual deploy env drift** — Brightline and Mirotech Vercel projects must keep handoff/SSO/content secrets aligned manually.
7. **Local env branch mismatch** — migration accidents possible if `DATABASE_URL` and `DIRECT_URL` target different Neon branches.

---

## 7. Recommended mitigations

| Priority | Mitigation |
| --- | --- |
| **High** | Complete Neon audit worksheet: plan tier, history window, root branch name, snapshot count ([neon-database-recovery.md](./neon-database-recovery.md)) |
| **High** | Establish **operator media backup policy** — periodic export of `client-galleries/`, `delivery/`, and critical public prefixes to cold storage (outside R2) |
| **High** | If production RPO > 6 hours required, **upgrade Neon plan** and set history window to operational target (7–30 days per plan) |
| **Medium** | Document and use **Neon preview/dev branch** for migration validation; never point Preview Vercel at production `DATABASE_URL` |
| **Medium** | Fix local dev env: single Neon branch for both `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) |
| **Medium** | Quarterly **rollback drill** — promote previous Vercel deployment on Preview/staging only; Neon branch restore on dev branch |
| **Medium** | Review R2 lifecycle rules in Cloudflare dashboard — ensure no accidental expiration on production prefixes |
| **Low** | Enable Neon **manual snapshots** before major migrations (Free: 1 snapshot; paid: more) |
| **Low** | Uptime monitor on public home + admin login once platform routes are on production assignment |

---

## RTO / RPO targets (not guarantees)

These are **operational targets** based on current architecture and Neon/R2/Vercel behavior. Actual recovery time depends on incident scope, operator availability, and **unverified Neon plan settings**.

| Layer | RPO target (data loss window) | RTO target (restore effort) |
| --- | --- | --- |
| **Application (Vercel)** | Last deploy only | **~5–15 minutes** to promote prior Ready deployment |
| **Postgres (Neon)** | **Up to 6 hours** on Brightline (`history_retention_seconds: 21600`, Free-plan cap) | **Minutes–hours** — PITR branch + Vercel env swap + smoke tests; Neon restore operation often fast, operator workflow dominates |
| **R2 media** | **Unbounded** if no external backup | **Hours–days** or **irrecoverable** — re-upload from exports |
| **Secrets** | N/A | **~15–60 minutes** — rotate providers + Vercel env + redeploy both brands if shared SSO/handoff |
| **Publishing queue** | Jobs since last successful drain | **Hours** on Hobby (daily cron) unless manual cron invoke |

**Not guaranteed:** cross-region Neon failover, zero-dataloss R2, automatic cross-brand secret sync, or rollback of applied Prisma migrations.

---

## Validation log

| Date | Actor | Notes |
| --- | --- | --- |
| 2026-08-29 | Phase 18 validation | Safe checks only; report authored |
| 2026-08-28 | Phase 12C | Prior `deploy:check:env` + health 404 note |
