# Production operations runbook

**Project:** Brightline Photography ↔ MiroTech Solutions  
**Last updated:** 2026-08-28 (Phase 12C)  
**Production URL:** `https://brightlinephotography.com`  
**Related deploy:** `https://mirotech.solutions` (separate Vercel project; shared secrets for handoff/SSO)

This runbook documents **restore and recovery** procedures. It does not invent infrastructure capabilities not present in repo configuration. **Never paste secret values** into tickets, chat, or this document.

---

## System overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Vercel Hobby — brightlinephotography.com                                │
│ Next.js 16 App Router · Node 20 · ~272 API routes                       │
├─────────────────────────────────────────────────────────────────────────┤
│ Public site · /admin · /studio · /accountant · /client                  │
│ proxy.ts — CSP, admin CSRF, route gates                                 │
├──────────────┬────────────────────┬───────────────────────────────────────┤
│ Neon Postgres│ Cloudflare R2      │ External APIs                         │
│ Prisma 5     │ brightline bucket  │ Resend, Stripe, OpenAI, fal, Canva   │
│              │ + mirotech bucket  │ Mirotech Content API, Studio Hub      │
└──────────────┴────────────────────┴───────────────────────────────────────┘
```

| Component | Implementation in this repo |
| --- | --- |
| **App host** | Vercel (`vercel.json` — crons, redirects) |
| **Database** | Neon Postgres — `DATABASE_URL` (pooled), `DIRECT_URL` (migrations) |
| **Media** | Cloudflare R2 — `R2_*` (Brightline), `MIROTECH_R2_*` (Mirotech vault) |
| **Admin auth** | Signed `admin_access` cookie (`ADMIN_SESSION_SECRET`, `ADMIN_ACCESS_CODE`) |
| **Platform identity** | Optional `PlatformUser` + SSO (`PLATFORM_IDENTITY_ENABLED`, `PLATFORM_SSO_EXCHANGE_SECRET`) |
| **Legacy cross-site admin** | HMAC handoff `ho1` (`MIROTECH_ADMIN_HANDOFF_SECRET`) |
| **Accountant portal** | JWT `accountant_session` (`ACCOUNTANT_SESSION_SECRET`) |
| **Background jobs** | `platform_jobs` table + in-process drain — **not** Inngest/Trigger/queues |
| **Job scheduler** | Vercel Cron → `GET /api/cron/platform-jobs` (daily 15:30 UTC) |
| **Publishing** | Legacy sync paths by default; platform path when `PLATFORM_PUBLISHING_ENABLED=true` |
| **Rate limits** | Upstash Redis (optional) or Neon `RateLimitBucket` table |

**Platform health probes**

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `GET /api/platform/health` | Public | Liveness — DB ping only |
| `GET /api/admin/platform/health` | Admin | Extended flags (no secrets) |
| `GET /api/admin/platform/metrics` | Admin | 24h operational metrics |

*Note:* Platform routes ship with the `architecture/platform-foundation` branch. If production has not been deployed from that branch, `/api/platform/*` may return 404 until promoted.

---

## Deployment

### Standard production release (migrations first)

From the app root (`package.json` + `prisma/`):

```bash
# Clean tree on allowed branch; production DB URLs in shell or .env.production.local
npm run deploy:check:env    # read-only checklist
npm run deploy:prod         # type DEPLOY — runs prisma migrate deploy, then vercel deploy --prod
```

**Branch overrides:** production has used `studio-os-cms-production-20260425` — use `npm run deploy:prod:go:studio-os` or set `REQUIRED_GIT_BRANCH`.

**What deploy does NOT do:** apply migrations if you run `vercel deploy --prod` alone. Always migrate before or use `deploy:prod`.

### Git push auto-deploy

If Vercel is connected to GitHub, pushes to the configured production branch trigger builds. **Migrations are not automatic** unless a separate CI step runs `prisma migrate deploy` — treat DB schema as operator-managed.

### Pre-deploy validation (safe)

| Check | Command / action |
| --- | --- |
| Env presence | `npm run deploy:check:env` |
| Tests | `npm test` |
| Typecheck | `npx tsc --noEmit` |
| Migration status | `npx prisma migrate status` (with prod URLs only when intentional) |
| Public liveness | `curl -sS https://brightlinephotography.com/api/platform/health` (when route deployed) |

---

## Rollback

### 1. Application rollback (Vercel)

**Fastest path for bad release:**

1. Vercel Dashboard → Project → **Deployments**.
2. Find the last known-good production deployment.
3. **Promote to Production** (or Instant Rollback if offered).

This restores **application code and serverless bundles** only. It does **not** reverse database migrations.

**CLI alternative:** redeploy a known git commit via `vercel deploy --prod` from a clean checkout of that commit (after team approval).

### 2. Feature flag rollback (no redeploy required)

Platform strangler flags default **off** when unset — legacy paths remain production default.

| Goal | Action (Vercel → Environment Variables → Production) |
| --- | --- |
| Disable platform publishing | `PLATFORM_PUBLISHING_ENABLED=false` or remove |
| Disable platform jobs drain | `PLATFORM_JOBS_ENABLED=false` |
| Disable platform SSO | `PLATFORM_IDENTITY_ENABLED=false` |
| Restore handoff-only cross-site admin | `LEGACY_ADMIN_HANDOFF_ENABLED=true` (default when unset) |
| Disable platform audit writes | `PLATFORM_AUDIT_ENABLED=false` |

Redeploy may be required for env changes to reach all instances — Vercel typically picks up env on next deployment or within minutes.

See [deployment.md](../deployment.md#platform-migration-flags) and [publishing-cutover-runbook.md](../architecture/publishing-cutover-runbook.md).

### 3. Database migration rollback

**There is no automated down-migration in this repo.**

| Situation | Procedure |
| --- | --- |
| Migration failed mid-deploy | **Stop.** Do not deploy app. Fix migration SQL or DB with team process. Re-run `prisma migrate deploy`. |
| App rolled back but DB migrated | Old app code may break on new schema — prefer forward-fix deploy or Neon point-in-time recovery (see below). |
| Emergency | Do **not** `prisma db push`, `migrate reset`, or drop tables on production without explicit approval and backup. |

Additive migrations (platform tables) can often stay in place while app code rolls back — unused columns/tables are harmless.

### 4. Content / CMS rollback (no deploy)

| Surface | Action |
| --- | --- |
| Design section | Admin → Design → section **Hidden** |
| Resume page | SiteSetting `resume_page:v1` → `enabled: false` |
| Blog publish to Mirotech | Disable `PLATFORM_PUBLISHING_ENABLED` or fix Mirotech API |

---

## Incident checklist

Use this sequence for production incidents:

1. **Triage** — What broke? (public site, admin, studio, publishing, media, auth)
2. **Scope** — Brightline only vs Mirotech vs both vs third-party (Stripe, Resend, OpenAI)
3. **Recent change** — Vercel deploy, env var edit, migration, bulk R2 script
4. **Health** — Admin → Studio System metrics, or `GET /api/admin/platform/health` (when deployed)
5. **Logs** — Vercel deployment/runtime logs; search `cron.platform-jobs`, `job.drain`, `identity.sso.failed`
6. **Stabilize** — Promote previous Vercel deployment **or** disable platform flags
7. **Data** — If DB corruption suspected, pause writes; consult Neon recovery (dashboard)
8. **Communicate** — Document timeline; avoid bulk production API/R2 work during outage (Vercel Hobby transfer budget)
9. **Post-incident** — Update this runbook if a gap was found

**Alerting reference:** [alerting.md](./alerting.md)

---

## Service ownership

| Area | Owner / surface |
| --- | --- |
| Brightline Vercel project | Repo admin / engineering |
| Mirotech Vercel project | Mirotech deploy operator |
| Neon database | Operator with Neon dashboard access |
| Cloudflare R2 | Operator with Cloudflare account |
| Domain / DNS | Domain registrar + Cloudflare |
| Stripe / Resend / OpenAI keys | Operator; rotate in provider + Vercel env |
| Google Sheet image pipeline | Apps Script `tools/doPost.gs` (separate from Vercel) |

---

## Failure scenarios and recovery

### Brightline deployment failure

**Symptoms:** Vercel build error; site 5xx or stale deployment.

**Recovery:**

1. Read Vercel build logs (TypeScript, Prisma generate, Next build).
2. Fix locally; verify preview deployment green.
3. Promote preview **or** re-run `npm run deploy:prod` from clean tree.
4. If production still serves old deployment, confirm which deployment is assigned to production domain.

**Do not:** deploy with dirty git tree via raw `vercel deploy --prod` unless explicitly accepting untracked code risk.

---

### MiroTech deployment failure

**Symptoms:** `mirotech.solutions` down; Brightline hub publish / journal sync fails; handoff redirects fail.

**Recovery:**

1. Restore Mirotech Vercel deployment (same promote-to-production flow on **Mirotech project**).
2. Verify `MIROTECH_CONTENT_API_URL`, `CONTENT_API_SECRET`, `MIROTECH_SITE_URL` on Brightline still match Mirotech.
3. Brightline admin R2 Mirotech vault uses `MIROTECH_R2_*` — independent of Mirotech site deploy but same Cloudflare account.

**Fallback:** `LEGACY_ADMIN_HANDOFF_ENABLED` + `/api/admin/mirotech/handoff` when SSO staff session unavailable ([sso-current-state.md](../architecture/sso-current-state.md)).

---

### Database unavailable (Neon)

**Symptoms:** `GET /api/platform/health` → `database: error`; Prisma errors site-wide; admin login may fail if session store touches DB.

**Recovery:**

1. Check [Neon status](https://status.neon.tech) and Neon project dashboard (connection limits, suspend, maintenance).
2. Verify Vercel env `DATABASE_URL` / `DIRECT_URL` still valid (no accidental branch URL swap).
3. If data corruption or bad migration: see **Database recovery** below — use Neon console capabilities only after confirming what the plan provides.
4. After DB restored: confirm `npx prisma migrate status` shows sync before deploying new app code.

**Safe validation:** `npm run deploy:check:env` with production URLs reports migrate status without printing secrets.

---

### R2 unavailable (Cloudflare)

**Symptoms:** Images/video 404 or timeout; upload-url routes fail; `asset.read.*` metrics spike.

**Recovery:**

1. Check [Cloudflare status](https://www.cloudflarestatus.com/).
2. Verify `R2_ENDPOINT`, bucket names, and API tokens in Vercel env.
3. Test one object with `tools/verify-r2-object.mjs` locally (credentials from env, not committed).
4. **Registry vs object:** `platform_assets` rows may exist while R2 object missing — backfill/verify runbooks in [asset-backfill-runbook.md](../architecture/asset-backfill-runbook.md).

**No secondary media backup is configured in this repo** — recovery depends on R2 durability and any operator-held exports.

---

### Job provider unavailable

**Context:** Jobs are **not** outsourced to Inngest/Trigger. Provider = **this app's** `platform_jobs` table + `drainPlatformJobs()` in serverless/cron.

**Symptoms:** Publishing stays `PENDING`; `GET /api/admin/platform/metrics` shows job failures; cron logs `cron.platform-jobs` error.

**Recovery:**

1. Confirm `PLATFORM_JOBS_ENABLED=true` in production (if async publishing expected).
2. Confirm `CRON_SECRET` matches Vercel cron authorization (`guardCronBearer`).
3. Vercel Hobby: platform-jobs cron runs **once daily** (15:30 UTC) — backlog may wait until next run unless manually triggered:
   - `GET /api/cron/platform-jobs` with `Authorization: Bearer $CRON_SECRET` (operator only; do not expose secret).
4. Inspect failed rows in `platform_jobs` (admin job API or SQL read-only).
5. Retry eligible publishing jobs via Studio → Publishing → retry API when permissions allow.

**Flag rollback:** `PLATFORM_JOBS_ENABLED=false` returns to synchronous legacy publish paths where implemented.

---

### SSO failure

**Symptoms:** Cross-domain admin broken; `identity.sso.failed` in logs; metrics `audit.ssoFailed` elevated.

**Recovery:**

1. `GET /api/admin/platform/sso/status` on **both** Brightline and Mirotech (admin session required).
2. Verify on **both** Vercel projects:
   - `PLATFORM_IDENTITY_ENABLED=true`
   - `PLATFORM_SSO_EXCHANGE_SECRET` **identical** (32+ chars)
3. Confirm canonical URLs: `https://brightlinephotography.com`, `https://mirotech.solutions` (not `.co` in env).
4. Rate limits on redeem: `/api/platform/sso/redeem` (Phase 12A) — burst of failures may return 429.
5. **Fallback:** `MIROTECH_ADMIN_HANDOFF_SECRET` + `/api/admin/mirotech/handoff?next=...`

---

### Publishing failure

**Symptoms:** Blog save succeeds locally but Mirotech journal stale; hub PATCH async jobs `FAILED`; `BLOG_MIROTECH_SYNC_ERROR` in logs.

**Recovery:**

1. Check whether `PLATFORM_PUBLISHING_ENABLED` is on — determines legacy vs platform path ([publishing-cutover-runbook.md](../architecture/publishing-cutover-runbook.md)).
2. Verify `MIROTECH_CONTENT_API_URL`, `CONTENT_API_SECRET`, Mirotech Content API health.
3. For hub async publish: check `platform_jobs` for `publishing.mirotech.hub.patch` / `publishing.mirotech.journal.sync`.
4. **Rollback:** `PLATFORM_PUBLISHING_ENABLED=false` — legacy sync on next blog PATCH.
5. Local repair scripts (operator machine, production env): `scripts/resync-mirotech-journal.ts` — avoid high-volume production HTTP loops.

---

### Bad deployment release (logic bug, no infra outage)

**Recovery priority:**

1. **Vercel promote** previous deployment (minutes).
2. If bug tied to platform flags → disable relevant `PLATFORM_*` env.
3. If bug tied to CMS content → revert content in admin, not infra.
4. If migration already applied and incompatible → forward-fix or Neon PITR (with approval), not `migrate reset`.

---

## Database recovery (Neon)

**What this repo configures:**

| Item | Source |
| --- | --- |
| Runtime connection | `DATABASE_URL` — typically Neon **pooled** host (`-pooler`) |
| Migration connection | `DIRECT_URL` — Neon **direct** (non-pooled) host |
| Schema changes | Versioned `prisma/migrations/*` applied via `prisma migrate deploy` |
| Optional | `PRISMA_DATABASE_URL` — Prisma Accelerate (if enabled in Vercel) |

**What is NOT documented in this repository:**

- Neon project ID, region, or plan tier
- Point-in-time recovery (PITR) retention window
- Automatic backup schedule
- Branching strategy for prod vs preview

**Operator path:** Neon Dashboard → verify available restore/branch features on **actual plan** → see [neon-database-recovery.md](./neon-database-recovery.md) for console audit worksheet and recovery scenarios.

**Never on production without approval:** `prisma migrate reset`, `prisma db push`, manual `DROP TABLE`.

---

## Media recovery (R2)

**Assumptions:**

- R2 is the **primary and sole** object store for production media in normal operation.
- Brightline bucket (`R2_BUCKET`, `R2_PUBLIC_URL` / `media.brightlinephotography.com`).
- Mirotech site bucket (`MIROTECH_R2_BUCKET`, `MIROTECH_R2_PUBLIC_URL` / `media.mirotech.solutions`).
- `platform_assets` is a **registry** — deleting a row does not delete R2 bytes; deleting R2 does not auto-delete registry rows.

**Backup / lifecycle in repo:**

- **No automated secondary backup** (no S3 cross-replication, no lifecycle export jobs in codebase).
- Operator tools: `tools/delete-from-r2.mjs`, `tools/verify-r2-object.mjs`, local export scripts — manual.
- Client delivery archives and accountant receipts live under predictable R2 prefixes — recovery = R2 object restore or re-upload.

**Recovery sequence:**

1. Identify missing keys from CMS DB (`storageKey`, `PortfolioImage`, gallery tables) or `platform_assets.objectKey`.
2. Check R2 dashboard for object existence.
3. If object lost and no local export: **cannot be reconstructed from DB** — restore from operator Lightroom/exports backup if any.
4. Re-register: `npm run assets:backfill` (see [asset-backfill-runbook.md](../architecture/asset-backfill-runbook.md)).

---

## Environment recovery

Configure variables in **Vercel → Project → Settings → Environment Variables** (Production / Preview / Development). Local: `.env`, `.env.local`, `.env.production.local` (gitignored). Pull template: `vercel env pull .env.production.local`.

**Never commit or paste secret values.**

### Critical (site won't function without)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon pooled Postgres |
| `DIRECT_URL` | Neon direct URL for migrations |
| `ADMIN_ACCESS_CODE` | Admin login gate |
| `ADMIN_SESSION_SECRET` | Admin cookie signing (required in production) |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT` | Brightline media |
| `R2_PUBLIC_URL`, `NEXT_PUBLIC_R2_PUBLIC_URL` | Public media URLs |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL |

### Dual-brand / Mirotech integration

| Variable | Purpose |
| --- | --- |
| `MIROTECH_R2_*` | Mirotech vault from Brightline admin |
| `MIROTECH_CONTENT_API_URL` | Mirotech Content API base |
| `CONTENT_API_SECRET` | Bearer for Content API |
| `MIROTECH_SITE_URL` | Mirotech public origin |
| `MIROTECH_ADMIN_HANDOFF_SECRET` | Legacy `ho1` handoff (both deploys) |

### Platform (migration / ops)

| Variable | Purpose |
| --- | --- |
| `PLATFORM_CONTENT_ENABLED` | ContentService reads |
| `PLATFORM_MEDIA_ENABLED` | MediaService strangler |
| `PLATFORM_ASSET_REGISTRY_ENABLED` | Asset registry |
| `PLATFORM_ASSET_READ_ENABLED` | Asset-first reads |
| `PLATFORM_PUBLISHING_ENABLED` | PublishingService |
| `PLATFORM_IDENTITY_ENABLED` | PlatformUser + RBAC |
| `PLATFORM_JOBS_ENABLED` | Async jobs + cron drain |
| `PLATFORM_AUDIT_ENABLED` | Audit writes + activity |
| `LEGACY_ADMIN_HANDOFF_ENABLED` | Handoff fallback (default on) |
| `PLATFORM_SSO_EXCHANGE_SECRET` | Cross-domain SSO (both deploys) |
| `PLATFORM_SSO_NONCE_STORE` | Optional `memory` for local dev |
| `CRON_SECRET` | Authorize `/api/cron/*` |

### Auth (additional surfaces)

| Variable | Purpose |
| --- | --- |
| `ACCOUNTANT_SESSION_SECRET` | Accountant portal JWT |
| `CLIENT_*` / gallery secrets | Client delivery (see client routes) |

### Optional infrastructure

| Variable | Purpose |
| --- | --- |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Shared rate limits |
| `PRISMA_DATABASE_URL` | Prisma Accelerate |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | Error monitoring |

Full template: [.env.example](../../.env.example). Vercel-specific list: [DEPLOY.md](../../DEPLOY.md).

**Recovery after secret leak:** rotate in provider (Cloudflare, Neon, Resend, etc.) → update Vercel env → redeploy → revoke old keys.

---

## Common failure modes (quick reference)

| Symptom | Likely cause | First action |
| --- | --- | --- |
| Admin login fails | `ADMIN_SESSION_SECRET` / access code | Verify Vercel prod env; cookie domain |
| All images 404 | R2 URL or bucket misconfig | Check `R2_PUBLIC_URL`, Cloudflare status |
| Mirotech sync fails | Mirotech API or secret drift | Test Content API; compare `CONTENT_API_SECRET` |
| Jobs stuck PENDING | Cron disabled or `PLATFORM_JOBS_ENABLED=false` | Check cron + flag; manual cron GET |
| SSO 403/429 | Secret mismatch or rate limit | Align `PLATFORM_SSO_EXCHANGE_SECRET`; use handoff |
| Build fails on deploy | TS/Prisma/Next error | Fix locally; preview deploy |
| DB errors after deploy | Pending migration or wrong URL | `prisma migrate status`; stop and fix |

---

## Recovery sequence (major outage)

1. Confirm scope (Vercel vs Neon vs R2 vs external API).
2. Promote last good Vercel deployment if application regression.
3. Disable platform flags if platform path is suspect.
4. Restore Neon from dashboard if data issue (plan-dependent).
5. R2: verify objects; re-upload from exports if missing — **no repo automated backup**.
6. Re-enable flags incrementally; monitor metrics and health endpoints.
7. Run `npm run deploy:check:env` before next full release.

---

## Related documents

| Doc | Topic |
| --- | --- |
| [deployment.md](../deployment.md) | Safe deploy workflow |
| [production-deploy-checklist.md](../production-deploy-checklist.md) | Migration vs Vercel |
| [alerting.md](./alerting.md) | Alert signals |
| [publishing-cutover-runbook.md](../architecture/publishing-cutover-runbook.md) | Publishing flags |
| [asset-backfill-runbook.md](../architecture/asset-backfill-runbook.md) | Asset registry |
| [neon-database-recovery.md](./neon-database-recovery.md) | Neon console audit + PITR/branch recovery |
| [PHASE-12C-operations-report.md](../architecture/PHASE-12C-operations-report.md) | Phase 12C summary |
