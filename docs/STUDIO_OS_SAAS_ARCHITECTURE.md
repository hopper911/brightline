# Studio OS — SaaS / multi-tenant architecture (design note)

This document records **forward-looking boundaries** for evolving Bright Line Studio OS into a multi-tenant or white-label product. **No full SaaS implementation is implied** by the current codebase; this is safe prep for product and schema decisions.

## Current state

- **Single operator / single brand** deployment in practice.
- Auth is **admin-centric** (session-based access to `/admin` and `/studio`).
- Data is stored in **one Postgres database** (Neon) with **no `organizationId`** on core models.
- **AI ops** (`AiInvocation`) includes an optional **`workspaceId`** field (nullable) reserved for future tenancy without migrating existing rows.

## Recommended future layers (when/if you platformize)

### Organizations / workspaces

- Introduce **`Workspace`** (or `Organization`) as the top-level billing and data boundary.
- Add **`workspaceId`** to: `StudioProject`, `StudioClient`, `DeliveryPackage`, `StudioInvoice`, new AI logs, and automation runs.
- **Avoid** retro-fitting `workspaceId` onto public marketing `WorkProject` / `Gallery` until you have a clear content-tenancy story (published site vs. Studio OS).

### User roles and permissions

- Separate **workspace owner**, **staff**, and **client portal user** with a small RBAC matrix.
- Keep **client-facing** JWT/session scopes narrow (gallery read, package read, favoriting, downloads).
- Map automation and AI actions to **service accounts** or **impersonation** with audit logs.

### Billing and subscriptions

- Treat **Stripe** (or similar) as the source of truth for **subscription status** and **seat limits**; sync to `Workspace` state.
- Gate **AI invocation volume**, **storage (R2)**, and **automation frequency** by plan tier when you introduce usage-based pricing.

### Multi-tenant data isolation

- **Preferred:** shared DB with **mandatory `workspaceId` filter** on every query (defense in depth + integration tests).
- **Alternative:** database-per-tenant for enterprise — only if contracts require it; operational cost is high.

### White-label

- **Domain mapping** per workspace (custom hostname → workspace resolution in middleware).
- **Theming** already trends toward site-level settings; extend to **workspace-scoped theme** and suppress global brand where appropriate.

### API versioning

- Public/partner APIs should live under **`/api/v1/...`** with explicit deprecation headers before breaking changes.
- Internal Next.js route handlers can remain unversioned until external consumers exist.

## What not to do prematurely

- Do not add `organizationId` to every table before the first real multi-tenant customer.
- Do not build a full **prompt CMS in the database** until prompt churn justifies it (code-first registry is enough initially).
- Do not expose **raw AI logs** or **client PII** to third parties without a data retention and consent policy.

## Related implementation

- AI orchestration: `lib/ai/ops/`
- Engagement ledger: `EngagementEvent` model + `lib/engagement/recordEvent.ts`
- Operational health snapshots: `ProjectHealthSnapshot` + `GET /api/admin/studio/intelligence`
