# Brightline Accountant Portal

Finance-only workspace at **`/accountant`**, separate from Mission Control admin.

## Authentication

| Cookie / session | Purpose |
|------------------|---------|
| `admin_access` | Owner / operator (existing Mission Control login). Full portal permissions when visiting `/accountant`. |
| `accountant_session` | Signed JWT for `AccountantAccess` rows. **Does not** grant `admin_access`. |

Edge behavior is implemented in [`proxy.ts`](../proxy.ts): `/accountant/login` and `POST /api/accountant/login` are public; all other `/accountant` and `/api/accountant/*` routes require a valid admin cookie or accountant JWT.

### Environment

- **`ACCOUNTANT_SESSION_SECRET`** — required in production for signing accountant JWTs (see [`lib/accountant/jwt.ts`](../lib/accountant/jwt.ts)). If unset, verification fails and only the admin cookie can open the portal.

### Bootstrap (first accountant)

Operators call (with admin session or API auth per [`authorizeAdminRequest`](../lib/admin-auth.ts)):

`POST /api/admin/accountant-access` with JSON `{ "email", "password" }` (password min **12** characters). Creates `AccountantAccess` + default `AccountantPermission`, or resets password for an existing email.

## Permissions (`AccountantPermission`)

Defaults are defined in Prisma; notable defaults: **`canViewProjectFinancials`** and expense edit/create flags default **false**.

The portal UI hides nav items based on permissions. API routes call `assertPermission` from [`lib/accountant/auth.ts`](../lib/accountant/auth.ts).

## R2 object keys

- Receipts: `accounting/receipts/{year}/{month}/{uuid}-{safeName}`
- Archived reports: `accounting/documents/{year}/{month}/{uuid}-{safeName}`

Objects are **private**; downloads use presigned GET via [`/api/accountant/download`](../app/api/accountant/download/route.ts) (keys must stay under `accounting/receipts/` or `accounting/documents/`).

## Audit log

[`AccountantAuditLog`](../prisma/schema.prisma) records actions such as `accountant.login`, `accountant.export.*`, `accountant.download`, `accountant.receipt.finalize`, `accountant.note.create`, etc., with IP and user-agent when available.

## Related

- [INTERNAL_API_SURFACE.md](./INTERNAL_API_SURFACE.md) — high-level mention of `/api/accountant/*` (session/browser, not automation).
