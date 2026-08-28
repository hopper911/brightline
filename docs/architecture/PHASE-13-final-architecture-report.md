# PHASE 13 — Final Architecture Report

**Date:** 2026-08-28  
**Branch:** `architecture/platform-foundation`  
**Scope:** Final architecture documentation package—documentation only, no refactors.

---

## 1. Final architecture

Brightline and Mirotech are **independent public applications** (separate Vercel deployments). The Brightline monolith hosts public photography, Mission Control (`/admin`), Studio OS (`/studio`), Studio ops control plane (`/studio/ops`), accountant portal, and client delivery.

A **platform layer** (`lib/platform/`) provides tenant-scoped identity, content, media, publishing, jobs, audit, and observability—invoked from admin/studio routes, not as separate hosted microservices. Neon Postgres holds Brightline domain data plus `platform_*` tables. Cloudflare R2 holds two vaults (Brightline + Mirotech site media).

**Strangler flags** (`PLATFORM_*`) default off; legacy paths remain production default for several domains until explicitly enabled.

**Primary doc:** [system-overview.md](./system-overview.md)

---

## 2. Application boundaries

| Application | Deploy | Repo | Data |
| --- | --- | --- | --- |
| Brightline public + admin + Studio | `brightlinephotography.com` | This repo | Brightline Prisma schema + R2 brightline bucket |
| Mirotech public + CMS | `mirotech.solutions` | Separate project | Mirotech Postgres (not in Brightline schema) |
| Studio ops | Same as Brightline | `/studio/ops` routes | Uses platform context + links |

Integration: Content API, Studio Hub, handoff (`ho1`), SSO (`sso1`), shared R2 admin tools for Mirotech vault.

---

## 3. Platform services

| Service | Module | Flag |
| --- | --- | --- |
| Tenants | `lib/platform/tenants/` | Foundation |
| Identity | `lib/platform/identity/` | `PLATFORM_IDENTITY_ENABLED` |
| Authorization | `lib/platform/authorization/` | With identity |
| Content | `lib/platform/content/` | `PLATFORM_CONTENT_ENABLED` |
| Media | `lib/platform/media/` | `PLATFORM_MEDIA_ENABLED` |
| Assets | `lib/platform/assets/` | `PLATFORM_ASSET_REGISTRY_ENABLED` / read flag |
| Publishing | `lib/platform/publishing/` | `PLATFORM_PUBLISHING_ENABLED` |
| Jobs | `lib/platform/jobs/` | `PLATFORM_JOBS_ENABLED` |
| Audit | `lib/platform/audit/` | `PLATFORM_AUDIT_ENABLED` |
| Observability | `lib/platform/observability/` | Partial always-on |

---

## 4. Data ownership

- **Brightline domain:** Work, blog, galleries, Studio OS, deliveries, accountant—Prisma models in unified schema.
- **Platform domain:** `platform_tenants`, users, memberships, assets registry, jobs, audit, SSO nonces.
- **Mirotech domain:** CMS and published site on Mirotech deploy; Brightline accesses via HTTP + Mirotech R2 vault.

No FK from platform tables into Mirotech Postgres. Optional `PortfolioImage.assetId` → `platform_assets`.

Diagram: [system-overview.md § Data ownership](./system-overview.md#data-ownership)

---

## 5. Security model

- **Legacy admin** cookie + CSRF at edge (`proxy.ts`, `lib/truth/security.ts`).
- **PlatformUser** + **Membership** + tenant-scoped **RBAC** when identity enabled.
- **Tenant isolation** via membership checks, job tenant scoping, permission namespaces.
- **Agent scopes** defined but no production agents yet.
- **Private media:** R2 key policy, presigned admin access; client tokens separate from platform identity.

Detail: [system-overview.md § Security model](./system-overview.md#security-model), [authz-current-state.md](./authz-current-state.md)

---

## 6. Media architecture

- Dual R2 vaults: `R2_*` (Brightline), `MIROTECH_R2_*` (Mirotech site).
- Canonical I/O: `lib/storage-r2.ts` / `lib/r2.ts`.
- Optional **platform asset registry** (`platform_assets`) with global uniqueness on `(provider, bucket, objectKey)`.
- MediaService strangler on admin upload/sign when `PLATFORM_MEDIA_ENABLED`.
- **No secondary backup** documented in repo—R2 is primary store ([PHASE-12C](./PHASE-12C-operations-report.md)).

---

## 7. Publishing / jobs

- **Publishing:** `PublishingService` + Mirotech adapters; legacy sync when flag off.
- **Async hub/journal:** `platform_jobs` with idempotency keys; handlers call Studio Hub APIs.
- **Drain:** In-process `drainPlatformJobs` via Vercel cron (`/api/cron/platform-jobs`, daily on Hobby).
- **Not used:** Inngest, Trigger.dev, external queue SaaS.

Flows: [system-overview.md § Request flows](./system-overview.md#request-flows)

---

## 8. Studio

- **Studio OS** (`/studio`): existing Mission Control modules (tasks, finance, email).
- **Studio ops** (`/studio/ops`): control plane—Overview, Brightline, Mirotech, Content, Media, Publishing, System sections; tenant cookie + membership validation.
- ADRs: [ADR-012](./ADR-012-studio-ops-shell.md) through [ADR-016](./ADR-016-studio-audit-ops.md).

---

## 9. Observability

- Public health: `GET /api/platform/health` (DB ping).
- Admin: extended health, metrics snapshot, `platformLog`.
- Alerting: manual runbook ([alerting.md](../operations/alerting.md)).
- Optional Sentry. Asset-read counters in-process only.

ADR: [ADR-013](./ADR-013-observability.md)

---

## 10. Remaining intentional legacy components

From [legacy-retirement-plan.md](./legacy-retirement-plan.md):

- Dual-path media upload/sign routes (flag off).
- Legacy blog Mirotech sync (default when `PLATFORM_PUBLISHING_ENABLED` off).
- Handoff tokens default on.
- Shared admin access code (single operator pool).
- Domain tables still authoritative for most media keys (`assetId` bridge lightly used).
- Unified monolith schema—not per-domain database split.

---

## 11. Architecture documentation created

| Document | Path |
| --- | --- |
| System overview | [system-overview.md](./system-overview.md) |
| ADR index | [README.md](./README.md) |
| Portfolio summary | [portfolio-summary.md](./portfolio-summary.md) |
| This report | [PHASE-13-final-architecture-report.md](./PHASE-13-final-architecture-report.md) |

Prior phases: ADRs 001–016, current-state docs, phase reports 9A–12C, [production-runbook.md](../operations/production-runbook.md).

---

## 12. Mermaid diagrams created

In [system-overview.md](./system-overview.md):

1. **Architecture hierarchy** — users, identity, apps, platform services, asset registry, Postgres/R2, observability
2. **Data ownership** — Brightline / platform / Mirotech domains vs shared infra
3. **Media upload** sequence
4. **Content publishing** sequence
5. **SSO / admin access** sequence
6. **Background publishing job** sequence

---

## 13. Portfolio summary created

Client-facing narrative without exaggerated claims: [portfolio-summary.md](./portfolio-summary.md)

---

## Summary

Phase 13 completes the architecture documentation package for the platform foundation program. The system is documented as **implemented**: independent brand deploys, in-monolith platform services, Studio as operational control plane, strangler migration with flags, and explicit legacy boundaries. No architectural refactors were performed in this phase.
