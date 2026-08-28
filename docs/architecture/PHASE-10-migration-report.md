# ARCHITECTURE MIGRATION REPORT — PHASE 10

**Observability Foundation**  
**Date:** 2026-08-28  
**Branch:** `architecture/platform-foundation`  
**ADR:** [ADR-013-observability.md](./ADR-013-observability.md)

---

## 1. Existing monitoring

| Capability | Location | Notes |
| --- | --- | --- |
| **Sentry** | `lib/monitoring/sentry.ts`, `instrumentation.ts` | Optional via `SENTRY_DSN`; 5% trace sample in prod |
| **Vercel logs** | Platform default | stdout JSON from `platformLog` |
| **Console logging** | Legacy `console.*` in places | Phased toward structured logs |
| **Structured logger** | `lib/observability/platform-log.ts` | New canonical API |
| **Legacy wrapper** | `lib/observability/log.ts` (`apiLog`) | Delegates to `platformLog` |
| **Health endpoints** | Partial pre-Phase 10 | `check-storage`, job `health.test` |
| **Uptime checks** | None automated | Public `/api/platform/health` added |
| **Error boundaries** | `app/error.tsx` | Now reports to Sentry when configured |
| **Audit trail** | `platform_audit_events` | SSO + ops events |
| **Asset counters** | `read-observability.ts` | In-process, per instance |

---

## 2. Error monitoring

- **Standardized Sentry:** `captureException` redacts metadata, sets tags for correlation/tenant/service.
- **Error boundary:** Client render errors forwarded to Sentry with digest as correlation hint.
- **No duplicate platform:** Sentry retained; no second APM added.

---

## 3. Structured logging

**Schema:** `severity`, `service`, `action`, optional `tenant`, `resourceId`, `requestId`, `jobId`, `message`, redacted `meta`.

**Services covered:** platform, identity, jobs, media (+ existing `apiLog` → platform for cron/automation).

**Wired in Phase 10:**
- SSO failures (`identity`)
- Job drain failures (`jobs`)
- Audit write failures (`platform`)
- Asset read anomalies (`media`)

---

## 4. Correlation

- Header `x-brightline-correlation-id` on admin/studio operator traffic via `proxy.ts`.
- Health/metrics APIs echo header.
- Helpers in `lib/observability/correlation.ts`.
- **Not** full OpenTelemetry — grep-friendly IDs only.

---

## 5. Health checks

| Endpoint | Access | Returns |
| --- | --- | --- |
| `/api/platform/health` | Public | Liveness + DB ping |
| `/api/admin/platform/health` | Admin | Extended boolean flags |
| Studio `/studio/ops/system` | Admin | Inline health + metrics UI |

No secrets, DSNs, or connection strings exposed.

---

## 6. Metrics

**Admin API:** `GET /api/admin/platform/metrics`

| Signal | Source |
| --- | --- |
| Job pending/running/completed/failed | `platform_jobs` (24h) |
| Publishing success/failure | Jobs where `type` starts with `publishing.` |
| SSO started/completed/failed | `platform_audit_events` |
| Asset success/fallback/missing/mismatch | In-process counters |

Studio System page surfaces summary cards.

---

## 7. Alerting

Documented in [docs/operations/alerting.md](../operations/alerting.md):

1. Production build failure (Vercel)
2. Publishing failure spike
3. Job failure spike
4. Media access failures
5. SSO outage

No PagerDuty/automation in Phase 10 — manual thresholds on Hobby tier.

---

## 8. Secret redaction

`lib/observability/redact.ts`:

- Key patterns: password, secret, token, authorization, api_key, cookie, session, handoff, bearer, credential
- Value patterns: Bearer prefix, ho1./sso1./ps1., JWT shape, signed query URLs
- Applied in `platformLog` and `captureException`

---

## 9. Runtime impact

- **Low:** JSON stringify per log event; no extra network calls except Sentry on errors.
- **Health/metrics:** One DB query each (`SELECT 1`, groupBy) — admin-only, no-store caching.
- **Correlation:** Single header read/write in proxy for operator paths.
- **Asset metrics:** Still in-memory (reset on cold start) — acceptable for cutover signals.

---

## 10. Recommended cleanup phase

**Phase 10B / 11 (future):**

1. Migrate remaining `console.*` in platform services to `platformLog`.
2. External uptime monitor on `/api/platform/health`.
3. Optional: persist asset read counters to DB or edge KV for cross-instance aggregation.
4. Sentry release health tied to Vercel deploy webhooks.
5. Replace manual alert thresholds with Vercel log drains or Sentry alerts when plan allows.

---

## Files added / changed

**New:**
- `lib/observability/{types,redact,correlation,platform-log}.ts` + tests
- `lib/platform/observability/{health,metrics-snapshot,server}.ts` + test
- `app/api/platform/health/route.ts`
- `app/api/admin/platform/{health,metrics}/route.ts`
- `docs/architecture/ADR-013-observability.md`
- `docs/operations/alerting.md`

**Updated:**
- `proxy.ts` — correlation injection
- `lib/monitoring/sentry.ts`, `app/error.tsx`
- `lib/observability/log.ts` — apiLog wrapper
- SSO, jobs drain, audit, asset read observability
- `app/studio/ops/system/page.tsx`, `lib/studio/ops/nav.ts`
