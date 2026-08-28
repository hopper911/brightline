# ADR-003: Platform Audit Events (Phase 2A)

**Status:** Accepted  
**Date:** 2026-08-28  
**Depends on:** [ADR-001](./ADR-001-platform-foundation.md), [ADR-002](./ADR-002-tenant-context.md)

## Purpose

Provide a **cross-tenant operational audit trail** for Brightline, MiroTech, Studio, background jobs, platform services, and AI agents. This is not an analytics pipeline — it records who/what changed important resources for compliance, debugging, and future agent accountability.

## Event structure

`PlatformAuditEvent` (`platform_audit_events`):

| Field | Role |
| --- | --- |
| `id` | cuid primary key |
| `tenantSlug` | Required — denormalized tenant (`brightline` / `mirotech`) |
| `tenantId` | Optional FK → `platform_tenants` when row exists |
| `actorType` | `USER` \| `SYSTEM` \| `AGENT` \| `SERVICE` |
| `actorId` | Optional opaque actor identifier |
| `action` | Machine-readable dotted string |
| `resourceType` / `resourceId` | Logical resource reference (no FK to domain tables) |
| `metadata` | JSON — sanitized before write |
| `createdAt` | Event timestamp |

## Relationship to existing audit tables

**Not reused** — domain-specific logs remain in place:

| Table | Scope |
| --- | --- |
| `AccountantAuditLog` | Accountant portal actions |
| `DocumentAuditLog` | Generated documents / form submissions |
| `AiInvocation` | AI ops telemetry (tokens, latency) |

`PlatformAuditEvent` is the neutral platform layer for cross-cutting operations. Domain logs may later emit platform events, but are not replaced in Phase 2A.

## Tenant relationship

Every event carries `tenantSlug` from `PlatformContext`. Optional `tenantId` is resolved via `findPlatformTenantBySlug()` when the platform tenant row exists. Missing DB row does not block the event — slug is sufficient for queries.

## Actor types

| Type | Use |
| --- | --- |
| `USER` | Human operator (admin, studio, accountant) |
| `SYSTEM` | Cron, migrations, internal batch jobs |
| `AGENT` | AI / automated agents |
| `SERVICE` | Platform service adapters |

`actorId` may be null (e.g. `SYSTEM` cron with no user).

## Action naming convention

Lowercase segments separated by dots:

- `gallery.published`
- `media.uploaded`
- `platform.audit.test`

Validated by `PLATFORM_AUDIT_ACTION_PATTERN`. No closed enum — actions are extensible.

Human sentences are rejected.

## Resource representation

`resourceType` + `resourceId` identify the affected entity without nullable FKs to every domain table. Example: `{ type: "gallery", id: "abc123" }`.

## Metadata security policy

`sanitizeAuditMetadata()` runs before every insert. Keys matching password/secret/token/handoff/signed patterns are redacted. Values resembling Bearer tokens, JWTs, handoff payloads, or signed URL query params are redacted.

**Never store:** passwords, session tokens, API keys, signed URLs, authorization headers, handoff tokens, or secret env values in metadata.

## Failure policy

| Mode | Behavior |
| --- | --- |
| Default (`strict: false`) | Write failure logged to stderr; caller receives `{ ok: false }`; **public request continues** |
| `strict: true` | Write failure propagates — for future security-sensitive paths only |

No retry queue in Phase 2A. Audit failures must be observable (console error prefix `[platform-audit]`).

Writes are gated by `PLATFORM_AUDIT_ENABLED` (default **off**). When disabled, `record()` returns `{ skipped: true }` without touching the database.

## Retention

No automatic purge in Phase 2A. Future phases may add TTL/archival policy per tenant and compliance requirements. Index on `createdAt` supports time-range queries and future retention jobs.

## Future use

- Jobs/agents: `actorType: AGENT` with scoped `actorId`
- Admin read API behind platform permissions (later)
- Correlation IDs in metadata (later, optional)

## First production integration (Phase 2B)

| Item | Choice |
| --- | --- |
| **Workflow** | `PUT /api/admin/design-section` — saves Brightline Design section CMS settings (`SiteSetting` key `design_section:v1`) |
| **Why** | Admin-authenticated, non-destructive metadata update; no media, auth, publishing, payments, or client access; clear success boundary via `saveDesignSectionSettings()` |
| **Integration point** | `app/api/admin/design-section/route.ts` — audit runs **after** successful save |
| **Helper** | `auditDesignSectionSettingsSaved()` in `lib/platform/audit/integrations/design-section-settings.ts` |
| **Tenant** | `createPlatformContextForTenant('brightline')` — design section is Brightline public chrome |
| **Actor** | `SYSTEM` (cookie admin has no stable user id yet; attribution improves in identity phase) |
| **Action** | `site_setting.updated` |
| **Resource** | `{ type: 'site_setting', id: 'design_section:v1' }` |
| **Metadata** | `{ source: 'admin', route, changedFields }` — field names only, no full settings body |
| **Failure behavior** | `recordAuditSafely()` — business PUT still returns `{ ok: true, settings }`; audit errors logged to stderr |
| **Flag** | Writes only when `PLATFORM_AUDIT_ENABLED=true` (default off in production) |

Business behavior is unchanged when audit is disabled or fails.

## Rollback

1. Remove `lib/platform/audit/` and revert schema migration
2. Drop `platform_audit_events` when no consumers depend on it
3. Unset `PLATFORM_AUDIT_ENABLED` (already default off)

No legacy routes depended on `platformAuditService` before Phase 2B. Phase 2B adds a single optional call in the design-section admin route; remove that call to revert integration without dropping schema.

## References

- `lib/platform/audit/audit-service.ts`
- Migration: `20260828140000_platform_audit_events`
