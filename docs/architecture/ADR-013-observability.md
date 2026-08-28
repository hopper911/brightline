# ADR-013: Observability Foundation (Phase 10)

**Status:** Accepted  
**Date:** 2026-08-28  
**Depends on:** [ADR-012 Studio ops shell](./ADR-012-studio-ops-shell.md), [ADR-003 Audit events](./ADR-003-audit-events.md), [ADR-008 Background jobs](./ADR-008-background-jobs.md)

> Note: Phase 10 originally referenced `ADR-011-observability`; ADR-011 is reserved for parallel SSO. This document is **ADR-013**.

## Context

Brightline and MiroTech share a platform layer (identity, jobs, publishing, media, content) deployed on Vercel Hobby. Operators need actionable visibility without noisy logs, secret leakage, or expensive bulk telemetry through serverless.

## Decision

### 1. Error monitoring — Sentry (existing)

- Keep optional `@sentry/nextjs` via `lib/monitoring/sentry.ts` and `instrumentation.ts`.
- No DSN → no-op with console fallback.
- `captureException` redacts context and tags `correlationId`, `service`, `tenant`.
- Root `app/error.tsx` captures uncaught render errors.

### 2. Structured logging — `platformLog`

Single JSON line per event in `lib/observability/platform-log.ts`:

| Field | Purpose |
| --- | --- |
| `severity` | debug \| info \| warn \| error |
| `service` | brightline, mirotech, platform, studio, identity, jobs, publishing, content, media |
| `action` | Stable dot-notation identifier |
| `tenant` | Optional tenant slug |
| `resourceId` | Optional entity id |
| `requestId` / `jobId` | Correlation helpers |
| `meta` | Redacted key/value bag |

Legacy `apiLog` delegates to `platformLog` for backward compatibility.

**Redaction:** `lib/observability/redact.ts` strips keys matching password/secret/token patterns and sensitive string values (Bearer, ho1., sso1., signed URLs).

### 3. Correlation ID

- Header: `x-brightline-correlation-id`
- Generated/propagated on operator paths in `proxy.ts` (admin, studio APIs).
- Health/metrics routes echo header on responses.
- No distributed tracing — correlation for log grep and Sentry tags only.

### 4. Health endpoints

| Route | Auth | Payload |
| --- | --- | --- |
| `GET /api/platform/health` | Public | `ok`, `ts`, `checks.app`, `checks.database` |
| `GET /api/admin/platform/health` | Admin | Above + boolean extended flags (Sentry/SSO/jobs configured) |

Never returns DSNs, connection strings, or env secret values.

### 5. Operational metrics

`GET /api/admin/platform/metrics` (admin) and Studio ops System page:

- **24h window** from `platform_jobs` and `platform_audit_events` (SSO actions)
- **In-process** asset read counters (success, fallback, missing, tenant mismatch)
- Publishing job success/failure derived from `publishing.*` job types

### 6. Wired log points (Phase 10)

- SSO redeem failures → `identity.sso.failed` (warn)
- Job drain failures → `job.drain.failed` / `job.drain.error` (error)
- Audit write failures → `audit.record.failed` (warn)
- Asset read anomalies → `asset.read.*` (info/warn; success not logged)

### 7. Alerting (documented, not automated)

See [operations alerting runbook](../operations/alerting.md). Critical signals:

- Production build failure (Vercel)
- Publishing job failure spike
- Platform job failure spike
- Asset missing / tenant mismatch spike
- SSO failure spike

## Consequences

**Positive:** Consistent JSON logs in Vercel; admin probes for uptime; Studio System dashboard; secret-safe telemetry.

**Negative:** Asset metrics are per-instance (serverless cold starts reset counters); no full APM.

## Rollback

Remove new routes and observability modules. Revert `apiLog` wrapper. Sentry and audit remain unchanged.
