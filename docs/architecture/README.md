# Architecture documentation index

**Brightline Photography ↔ MiroTech Solutions**  
**Last updated:** 2026-08-28 (Phase 13)

This folder contains architecture decision records (ADRs), current-state inventories, migration phase reports, and the **system overview** for the shared platform layer introduced in the `architecture/platform-foundation` program.

---

## Start here

| Document | Audience | Description |
| --- | --- | --- |
| [system-overview.md](./system-overview.md) | Engineers, hiring managers, CTOs | End-to-end architecture, diagrams, security, deployment |
| [portfolio-summary.md](./portfolio-summary.md) | Technical clients, stakeholders | Business-facing summary without exaggeration |
| [current-state.md](./current-state.md) | Engineers | Phase 0 inventory of repo and integrations |
| [production-runbook.md](../operations/production-runbook.md) | Operators | DR, rollback, env recovery |

---

## Architecture Decision Records (ADRs)

Core platform (Phases 1–8):

| ADR | Title | Status |
| --- | --- | --- |
| [ADR-001](./ADR-001-platform-foundation.md) | Platform foundation | Accepted |
| [ADR-002](./ADR-002-tenant-context.md) | Tenant context | Accepted |
| [ADR-003](./ADR-003-audit-events.md) | Platform audit events | Accepted |
| [ADR-004](./ADR-004-media-service.md) | MediaService boundary | Accepted |
| [ADR-005](./ADR-005-asset-registry.md) | Platform asset registry | Accepted |
| [ADR-006](./ADR-006-content-service.md) | Platform content service | Accepted |
| [ADR-007](./ADR-007-publishing-service.md) | Platform publishing service | Accepted |
| [ADR-008](./ADR-008-background-jobs.md) | Platform background jobs | Accepted |
| [ADR-009](./ADR-009-central-identity.md) | Central platform identity | Accepted |
| [ADR-010](./ADR-010-rbac.md) | Platform RBAC and scoped permissions | Accepted |
| [ADR-010-platform-rbac.md](./ADR-010-platform-rbac.md) | _(superseded duplicate — use ADR-010-rbac)_ | Superseded |
| [ADR-011](./ADR-011-parallel-sso.md) | Parallel cross-domain staff SSO | Accepted |

Studio control plane + observability (Phases 9–10):

| ADR | Title | Status |
| --- | --- | --- |
| [ADR-012](./ADR-012-studio-ops-shell.md) | Studio operational shell | Accepted |
| [ADR-013](./ADR-013-observability.md) | Observability foundation | Accepted |
| [ADR-014](./ADR-014-studio-content-media.md) | Studio content + media integration | Accepted |
| [ADR-015](./ADR-015-studio-publishing-ops.md) | Studio publishing operations | Accepted |
| [ADR-016](./ADR-016-studio-audit-ops.md) | Studio audit + system operations | Accepted |

**Note:** Observability is **ADR-013**, not ADR-011. ADR-011 covers parallel SSO.

---

## Current-state inventories

| Document | Domain |
| --- | --- |
| [content-current-state.md](./content-current-state.md) | Content service |
| [media-current-state.md](./media-current-state.md) | Media + R2 |
| [publishing-current-state.md](./publishing-current-state.md) | Publishing |
| [jobs-current-state.md](./jobs-current-state.md) | Background jobs |
| [identity-current-state.md](./identity-current-state.md) | Identity |
| [authz-current-state.md](./authz-current-state.md) | Authorization |
| [sso-current-state.md](./sso-current-state.md) | SSO |

---

## Runbooks

| Document | Topic |
| --- | --- |
| [publishing-cutover-runbook.md](./publishing-cutover-runbook.md) | `PLATFORM_PUBLISHING_ENABLED` cutover |
| [asset-backfill-runbook.md](./asset-backfill-runbook.md) | Asset registry backfill |
| [asset-read-cutover-runbook.md](./asset-read-cutover-runbook.md) | Asset-first reads |
| [publishing-decoupling.md](./publishing-decoupling.md) | Publishing strangler notes |

---

## Phase migration reports

| Phase | Report |
| --- | --- |
| 9A–9D | [PHASE-9A](./PHASE-9A-migration-report.md) … [PHASE-9D](./PHASE-9D-migration-report.md) |
| 10 | [PHASE-10-migration-report.md](./PHASE-10-migration-report.md) |
| 11B–11D | [PHASE-11B](./PHASE-11B-migration-report.md), [PHASE-11C](./PHASE-11C-migration-report.md), [PHASE-11D](./PHASE-11D-database-retirement-report.md) |
| 12A–12C | [PHASE-12A](./PHASE-12A-platform-hardening-report.md), [PHASE-12B](./PHASE-12B-platform-data-integrity-report.md), [PHASE-12C](./PHASE-12C-operations-report.md) |
| 13 | [PHASE-13-final-architecture-report.md](./PHASE-13-final-architecture-report.md) |

---

## Retirement and planning

| Document | Purpose |
| --- | --- |
| [legacy-retirement-plan.md](./legacy-retirement-plan.md) | What remains legacy vs platform; flag evidence |

---

## Diagram sources

Mermaid diagrams for system overview, data ownership, and request flows live in [system-overview.md](./system-overview.md).
