# Portfolio summary — Shared platform architecture

**Brightline Photography ↔ MiroTech Solutions**  
**Audience:** Technical clients, engineering leadership, hiring reviewers  
**Date:** 2026-08-28

---

## The business problem

Brightline Photography and MiroTech Solutions operate as related but distinct brands: a photography studio with client delivery, galleries, and a public portfolio, and a technology consultancy with its own marketing site and case studies. Operators routinely work across both brands—editing content, syncing journal posts, managing media in two Cloudflare R2 buckets, and switching between admin surfaces.

Without a shared structure, every cross-brand feature duplicated HTTP clients, permission assumptions, and publishing logic inside a large Next.js monolith. Changes risked breaking one brand while fixing another, and there was no consistent place to record who did what across tenants.

---

## The architectural challenge

The codebase already served production traffic: public websites, Mission Control admin, Studio OS, client galleries, and accountant tooling on a single Neon Postgres database and dual R2 vaults. Mirotech’s CMS lived in a **separate deployment** with its own database.

The challenge was to introduce **shared platform capabilities**—identity, content, media, publishing, jobs, audit, and observability—without a risky big-bang rewrite, without merging Mirotech into Brightline’s database, and without downtime for photography operations.

---

## Why the applications remain independent

**Brightline** (`brightlinephotography.com`) and **Mirotech** (`mirotech.solutions`) stay **separate Vercel deployments** with separate public origins. That preserves:

- Clear brand and DNS boundaries
- Independent rollback when one site regresses
- Mirotech CMS data sovereignty in its own Postgres

Brightline integrates with Mirotech through **HTTP APIs** (content read, Studio Hub write, journal ingest) and shared operator secrets for handoff and SSO—not through importing Mirotech tables into Brightline Prisma.

---

## How shared platform services reduce duplication

A `lib/platform/` layer in the Brightline repository defines tenant-aware services with stable contracts:

| Service | Role |
| --- | --- |
| Identity | `PlatformUser`, memberships, optional SSO across domains |
| Content | Adapters over Brightline CMS and Mirotech content reads |
| Media | Upload/sign strangler toward consistent vault handling |
| Publishing | Blog and hub sync with shared result types |
| Jobs | Durable `platform_jobs` for async hub/journal work |
| Audit | Append-only `platform_audit_events` for operator actions |
| Observability | Health, metrics, structured logging |

Legacy route handlers remain until each domain is cut over behind a **feature flag** (`PLATFORM_*`). Unset flags keep existing production behavior—migration is incremental, not a switch-flip for everything at once.

---

## How tenant separation protects data

Two logical tenants—`brightline` and `mirotech`—are registered in `platform_tenants`. Platform permissions are namespaced (`brightline.*`, `mirotech.*`). Membership ties a `PlatformUser` to a tenant and role; authorization resolves permissions only for tenants the user belongs to.

Media registry rows are tenant-scoped. Publishing jobs carry `tenantSlug`. Studio ops uses an explicit tenant switcher validated against memberships—not a client-supplied tenant string alone.

Legacy operator login still uses a shared admin cookie with a documented bypass during dual-auth migration; platform RBAC applies when identity is enabled and a PlatformUser is resolved.

---

## How Studio improves operations

**Studio** (`/studio`) already housed Mission Control workflows—tasks, finance, email. **Studio ops** (`/studio/ops`) adds a **control plane**: overview, tenant switch, and links into content, media, publishing, and system health without duplicating every admin screen.

Operators get one map of cross-brand tools, permission-aware sections, and probes (`/api/admin/platform/health`, metrics) while existing `/admin` workflows continue to function.

---

## How incremental migration avoided downtime

The program followed a **strangler fig** pattern across sixteen ADR-tracked phases:

1. Additive database tables (`platform_*`) with no destructive migrations
2. New services beside legacy code, default **off** via env flags
3. Studio integration layers that call platform services when enabled
4. Hardening (API tenant checks, rate limits) and operations runbooks before declaring the foundation complete

Production photography, galleries, and client delivery were never required to move in a single release. Domains cut over when staging evidence and operator approval support enabling each flag.

---

## How the system can support future products

The foundation is intentionally product-agnostic within the two-tenant model:

- New brands could register additional `platform_tenants` rows (with schema and permission design work)
- Agent scope presets exist for future automation principals
- Job types and publishing adapters extend without new queue SaaS
- Asset registry provides stable IDs if more surfaces adopt `platform_assets`

What is **not** claimed: multi-region active-active, external job queues, or full retirement of legacy paths—that work remains gated on production flag evidence ([legacy-retirement-plan.md](./legacy-retirement-plan.md)).

---

## Technology summary

| Layer | Choice |
| --- | --- |
| Application | Next.js 16, TypeScript, Vercel |
| Database | Neon Postgres, Prisma |
| Media | Cloudflare R2 (dual bucket) |
| Cross-brand admin | HMAC handoff + optional parallel SSO |
| Tests | Vitest (500+ unit tests in platform program) |

For technical depth, see [system-overview.md](./system-overview.md) and the [ADR index](./README.md).
