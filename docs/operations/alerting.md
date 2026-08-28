# Brightline / MiroTech — Critical alerting runbook

Minimal alert set for Vercel Hobby production. Prefer **Vercel deploy notifications** + periodic manual checks via Studio ops System until a paid observability tier is justified.

## 1. Production build failure

**Signal:** Vercel deployment status = Error; GitHub check failed on `main` / production branch.

**Action:**
1. Open Vercel deployment logs for the failing build step.
2. Fix locally, push to the platform foundation branch, verify preview deploy.
3. Promote to production only after preview is green.

**Owner:** Engineering on-call (repo admin).

## 2. Publishing failure spike

**Signal:** `GET /api/admin/platform/metrics` → `jobs.publishingFailed` elevated vs `publishingCompleted`; structured logs `job.drain.failed` with `type` starting `publishing.`.

**Threshold (manual):** More than 3 publishing failures in 24h or any failure during an active publish window.

**Action:**
1. Studio ops → System → check metrics.
2. Inspect failed job in admin job API or `platform_jobs` table.
3. Check Mirotech Content API / handoff bearer if journal sync jobs fail.

## 3. Platform job failure spike

**Signal:** `jobs.failed` rising; cron `/api/cron/platform-jobs` logs `cron.platform-jobs` error.

**Action:**
1. Confirm `PLATFORM_JOBS_ENABLED=true` and `CRON_SECRET` valid.
2. Review Vercel cron invocation (Hobby: daily schedule for platform-jobs).
3. Drain manually via cron endpoint if backlog is safe.

## 4. Media / asset access failures

**Signal:** Metrics `assetRead.missing` or `assetRead.tenantMismatch` increasing; logs `asset.read.assetMissing`.

**Action:**
1. Check R2 key integrity for affected tenant.
2. Verify asset registry backfill status.
3. Avoid bulk R2 moves through production API (use local scripts).

## 5. SSO outage

**Signal:** Metrics `audit.ssoFailed` spike; logs `identity.sso.failed`; operators cannot cross-domain admin.

**Action:**
1. `GET /api/admin/platform/sso/status` on both Brightline and Mirotech.
2. Verify `PLATFORM_IDENTITY_ENABLED`, `PLATFORM_SSO_EXCHANGE_SECRET` match on both projects.
3. Confirm canonical `.com` URLs in env (not `.co`).

## Non-alerts (noise)

- Single SSO failure (user back-button / expired state)
- Asset fallback to legacy URL during cutover (info)
- Audit disabled (`PLATFORM_AUDIT_ENABLED=false`) — expected in some envs

## Uptime check (optional)

External monitor: `GET https://brightlinephotography.com/api/platform/health` every 5–15 minutes. Expect HTTP 200 and `"ok": true`.
