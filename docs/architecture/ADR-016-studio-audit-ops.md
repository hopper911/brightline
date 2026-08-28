# ADR-016: Studio Audit + System Operations (Phase 9D)

**Status:** Accepted  
**Date:** 2026-08-28  
**Depends on:** [ADR-003 Audit events](./ADR-003-audit-events.md), [ADR-013 Observability](./ADR-013-observability.md)

## Context

Operators need a single Studio view for platform audit activity and lightweight system health without a second logging platform.

## Decision

### `/studio/activity`

- Lists `platform_audit_events` via `listPlatformAuditEvents` repository (not UI Prisma)
- Detail at `/studio/activity/[eventId]` with sanitized metadata
- Filters: tenant, action, actor type, resource type, date range, pagination cursor

### Permissions

- Requires `platform.audit.read` per tenant role (or legacy admin)
- Brightline-only operators never see Mirotech events

### Metadata security

- `sanitizeAuditMetadataForDisplay` on read (defense in depth with write-time sanitization)

### System status panel

- `getStudioSystemStatus()` — one `getPlatformHealthSnapshot({ extended: true })` + feature flags
- Components: Platform API, Database, Media, Jobs, Publishing, Authentication
- No per-page R2 probes or expensive infrastructure scans

## Rollback

Remove `/studio/activity` routes. Repository list functions remain safe to keep.
