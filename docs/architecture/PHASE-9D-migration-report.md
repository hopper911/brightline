# ARCHITECTURE MIGRATION REPORT — PHASE 9D

**Studio Audit + System Operations**  
**Date:** 2026-08-28  
**ADR:** [ADR-016-studio-audit-ops.md](./ADR-016-studio-audit-ops.md)

---

## 1. Audit UI

| Route | Purpose |
| --- | --- |
| `/studio/activity` | Filterable audit event list + system status |
| `/studio/activity/[eventId]` | Safe event detail |

Answers: what happened, actor, tenant, resource, success/failure, timestamp.

---

## 2. Filter support

- Tenant (permitted tenants only)
- Action (substring)
- Actor type (USER/SYSTEM/AGENT/SERVICE)
- Resource type
- Since / until (date)
- Cursor pagination

---

## 3. Permission enforcement

- `platform.audit.read` via tenant role (`ADMIN`/`OWNER`) or legacy admin
- `allowedAuditTenants()` — Brightline-only roles do not see Mirotech rows
- Unauthorized → `notFound()`

---

## 4. Metadata security

- Write-time: `sanitizeAuditMetadata` (existing)
- Read-time: `sanitizeAuditMetadataForDisplay` for Studio views
- No tokens, secrets, or signed URLs in UI

---

## 5. System status

Panel on activity page (single health call per request):

| Component | Source |
| --- | --- |
| Platform API | Health snapshot `checks.app` |
| Database | `checks.database` |
| Media provider | `media` + `assets` flags |
| Job provider | `jobs` flag |
| Publishing | `publishing` flag |
| Authentication | `identity` + SSO configured |

---

## 6. Existing observability reused

- `getPlatformHealthSnapshot` (Phase 10)
- `getPlatformFeatures` for component enablement
- No duplicate logging platform; audit data from `platform_audit_events`

---

## 7. Tests

| Suite | Coverage |
| --- | --- |
| `sanitize-metadata.test.ts` | Display redaction |
| `list-studio-activity.test.ts` | Tenant scoping |
| `system-status.test.ts` | Degraded auth when SSO off |
| `access.test.ts` | Audit tenant permissions |

---

## 8. Recommended Phase 11A

1. Export audit CSV for compliance (filtered, sanitized)
2. Correlate activity rows with job/publish detail links
3. Optional lightweight metrics strip (24h SSO/publish counts from existing snapshot)
4. Wire `platform.audit.read` on any future admin audit API routes
5. Consolidate `/studio/ops/system` into activity + publishing dashboards

---

## Files added

- `app/studio/activity/*`
- `lib/studio/activity/*`
- `lib/platform/audit/repository` list/find extensions
- `components/studio/StudioActivityTable.tsx`, `StudioSystemStatusPanel.tsx`
