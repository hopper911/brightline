# Phase 11E — Lead bridge column retirement

**Date:** 2026-08-28  
**Branch:** `architecture/platform-foundation`  
**Migration:** `20260828210000_drop_lead_studio_lead_bridge`

---

## Summary

Retired the legacy Lead admin/API surface and dropped unwired bridge columns between `Lead` and `StudioLead`. **StudioLead** remains the canonical inbound pipeline.

---

## 1. Legacy Lead API retired

| Removed | Replacement |
| --- | --- |
| `GET/PATCH /api/admin/leads/*` | Use `/api/admin/studio-leads/*` |
| `GET /api/admin/leads/export` | Studio leads export (future) / manual DB if needed |
| `/admin/leads` UI | `/admin/studio-leads` |

**Redirects (permanent):** `/admin/leads` and `/admin/leads/*` → `/admin/studio-leads` (`next.config.ts`)

**Nav:** Removed “Leads (legacy)” from admin sidebar; “Studio leads” unchanged in Operations group.

**Production evidence (11D):** 0 `Lead` rows; bridge columns never populated.

---

## 2. Schema changes (non-destructive to business data)

Migration drops only empty bridge columns:

| Table | Column dropped |
| --- | --- |
| `Lead` | `studioLeadId` (+ FK, indexes) |
| `StudioLead` | `legacyLeadId` (+ unique index) |

**Retained:** `Lead` table and all other columns (for historical rows if any appear later). Full `Lead` table retirement is a later phase.

---

## 3. Files changed

**Deleted:**

- `app/api/admin/leads/route.ts`
- `app/api/admin/leads/[id]/route.ts`
- `app/api/admin/leads/export/route.ts`
- `app/admin/(dashboard)/leads/page.tsx`
- `app/admin/(dashboard)/leads/[id]/page.tsx`

**Modified:**

- `prisma/schema.prisma`
- `prisma/migrations/20260828210000_drop_lead_studio_lead_bridge/migration.sql`
- `next.config.ts`
- `lib/admin-nav.ts`
- `app/admin/(dashboard)/portfolio/page.tsx`
- `app/admin/(dashboard)/studio-leads/page.tsx`
- `docs/architecture/legacy-retirement-plan.md`

---

## 4. Deploy notes

Apply migration before or with deploy:

```bash
npx prisma migrate deploy
```

Rollback: revert commit and restore columns via inverse migration (only if bridge data existed — prod had none).

---

## 5. Runtime behavior

- Operators using old `/admin/leads` bookmarks land on Studio leads.
- Legacy Lead API returns 404 (routes removed).
- No change to StudioLead CRUD, convert, or email flows.
