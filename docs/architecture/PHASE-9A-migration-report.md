# ARCHITECTURE MIGRATION REPORT — PHASE 9A

**Date:** 2026-08-28  
**Project:** Brightline Photography ↔ MiroTech Solutions  
**Scope:** Studio operational shell (navigation / control plane only)

---

## 1. Current admin map

| Surface | Base path | Purpose | Duplicates / overlap |
| --- | --- | --- | --- |
| **Brightline admin** | `/admin/*` | CMS, work, blog, delivery, media, R2, settings | Primary legacy chrome (`AdminNav`) |
| **Studio OS** | `/studio/*` | Mission Control, tasks, calendar, finance, invoices | Linked from admin Operate group; shares `AdminNav` |
| **Studio Hub** | `/admin/studio-cms/*` | Dual-brand hub projects | Overlaps Content + Publishing |
| **Mirotech hub** | `/admin/mirotech` | Remote admin launcher (handoff/SSO) | Overlaps MiroTech section |
| **Mirotech media CC** | `/admin/mirotech-media` | R2 audit/reorg | Overlaps Media section |
| **Mirotech remote** | `mirotech.solutions/admin/*` | Native Mirotech CMS | Accessed via handoff or SSO |
| **Accountant** | `/accountant/*` | Finance portal | Separate auth; not in ops shell |
| **Platform probes** | `/api/admin/platform/*` | Identity, RBAC, SSO status | Linked from System section |

**Orphan routes (functional, not in default nav):** `/admin/contracts/*`, `/studio/invoices/*`

---

## 2. Studio responsibility

Studio ops is the **operational control plane**:

- Organizes cross-brand entry points (Brightline + MiroTech)
- Surfaces content, media, publishing, and platform status
- **Does not** replace `/admin` or Mirotech CMS
- **Does not** serve public pages

Public apps (`brightlinephotography.com`, `mirotech.solutions`) remain independent deploys.

---

## 3. Shell created

| Asset | Path |
| --- | --- |
| Ops layout + auth gate | `app/studio/ops/layout.tsx` |
| Overview | `/studio/ops` |
| Section pages | `/studio/ops/{brightline,mirotech,content,media,publishing,system}` |
| Shell component | `components/studio/StudioOpsShell.tsx` |
| Link grid | `components/studio/StudioOpsLinkGrid.tsx` |
| Config | `lib/studio/ops/nav.ts`, `resolve-context.ts`, `types.ts` |
| APIs | `GET /api/studio/ops/context`, `POST /api/studio/ops/tenant` |

---

## 4. Navigation

```
Studio Ops
├── Overview        /studio/ops
├── Brightline      /studio/ops/brightline
├── MiroTech        /studio/ops/mirotech
├── Content         /studio/ops/content
├── Media           /studio/ops/media
├── Publishing      /studio/ops/publishing
└── System          /studio/ops/system
```

Legacy **AdminNav** unchanged; new item **Studio ops** → `/studio/ops` in Operate group.

---

## 5. Tenant switching

- Cookie: `studio_ops_tenant` (`brightline` | `mirotech`)
- Switch via `POST /api/studio/ops/tenant` — **403 if membership missing**
- Legacy admin (identity off or unmapped): synthetic OWNER on both tenants
- Platform user: only tenants present in `PlatformMembership`

---

## 6. Permission integration

Sections filtered via RBAC when `PLATFORM_IDENTITY_ENABLED=true`:

| Section | Gate (any of) |
| --- | --- |
| Brightline | `brightline.journal.read` |
| MiroTech | `mirotech.project.read` |
| Content | `brightline.journal.read` or `mirotech.journal.read` |
| Media | `platform.media.read` |
| Publishing | `brightline.journal.publish` or `mirotech.journal.publish` |
| System | `platform.identity.read` |

Legacy admin cookie: all sections visible (synthetic OWNER probe behavior).

Individual tool links also filter on optional `permission` metadata in `lib/studio/ops/nav.ts`.

---

## 7. Existing tools linked

All section pages use **link grids** to existing routes — no duplicated editors or APIs.

Examples:

- Content → `/admin/studio-cms`, `/admin/work`, `/admin/blog`
- Media → `/admin/media`, `/admin/r2`, `/admin/mirotech-media`
- MiroTech → SSO start, handoff fallback, `/admin/mirotech`
- System → platform probe APIs, `/admin/settings`

---

## 8. Runtime impact

### Phase 8D-A (bundled)

- Admin login calls `ensureAdminPlatformUser()` (non-blocking; requires `ADMIN_EMAIL`)
- SSO start resolves PlatformUser from legacy admin; sets `ps1` on success
- `LEGACY_ADMIN_HANDOFF_ENABLED=false` redirects handoff route to SSO start

### Phase 9A

- New routes under `/studio/ops` — gated by existing `admin_access`
- No changes to public site, truth modules, or admin workflow logic
- No new credentials

**Flags:** `PLATFORM_IDENTITY_ENABLED`, `PLATFORM_SSO_EXCHANGE_SECRET`, `LEGACY_ADMIN_HANDOFF_ENABLED` (default true)

---

## 9. Recommended Phase 9B

1. **Observability panel** — wire System section to live job queue depth, publish outcomes, SSO audit counts
2. **Nav consolidation** — optional single shell replacing dual AdminNav + ops sub-nav
3. **Handoff cutover** — after SSO validation period, set `LEGACY_ADMIN_HANDOFF_ENABLED=false` by default
4. **Admin identity adapter** — email/OIDC replacing shared access code; mandatory PlatformUser mapping
5. **Workflow embedding** — iframe or deep-link patterns for high-traffic admin pages inside ops sections (still no logic duplication)

---

**Related:** [ADR-012](./ADR-012-studio-ops-shell.md), [sso-current-state.md](./sso-current-state.md)
