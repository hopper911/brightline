# Contracts & Forms Studio

Mission Control feature set for **document templates**, **generated agreements**, **client signing** (typed name + consent, no paid e-sign vendor in MVP), **PDF storage on private R2**, **audit logging**, and **assignable intake forms** with submissions.

## Data model (Prisma)

- **`DocumentTemplate`** — `title`, `type` (`DocumentTemplateType`), `contentHtml`, optional `contentJson`, `variables` (JSON array of string keys), `version`, `isActive`.
- **`GeneratedDocument`** — links `templateId`, `studioClientId`, optional `studioProjectId`, `studioInvoiceId`; `status` (`GeneratedDocumentStatus`); `contentHtml`; `variablesSnapshot` JSON; `clientToken` (unique, URL secret); `draftPdfKey` / `signedPdfKey`; timestamps for sent/viewed/signed/expired/declined/archived.
- **`DocumentSignature`** — one per document in MVP; name, email, consent, IP/UA, `documentVersion`.
- **`DocumentAuditLog`** — `documentId` and/or `formSubmissionId` nullable; `actorType` `admin` | `client` | `system`; `action` string; `metadata` JSON.
- **`FormTemplate`** / **`FormField`** / **`FormSubmission`** / **`FormSubmissionValue`** — builder + client submission storage; `clientToken` on submission for client URLs.
- **`StudioProject.requireSignedDocumentTypes`** — optional JSON array of `DocumentTemplateType`; use with [`lib/contracts/scheduling-gate.ts`](../lib/contracts/scheduling-gate.ts) for UI gating before `SCHEDULED`.

## Client URL semantics

- **Documents:** Admin shares `https://<site>/client/documents/<clientToken>`. The path parameter is **`clientToken`**, not the internal `GeneratedDocument.id` (cuid). Never expose internal IDs on public forms without the token.
- **Forms:** `https://<site>/client/forms/<clientToken>` for a `FormSubmission` assignment.
- **`/client/documents` (list):** When a **gallery access** cookie is present and the gallery’s `studioProjectId` resolves to a `StudioProject` with `clientId`, lists recent `GeneratedDocument` rows for that studio client. If the gallery is not linked, operators rely on email/deep links with tokens.

## R2 object layout

Private PDFs under keys from [`lib/contracts/r2-keys.ts`](../lib/contracts/r2-keys.ts):

`legal/contracts/{year}/{client-slug}/{project-slug}/{draft|signed}-{documentIdShort}.pdf`

Downloads use short-lived **`signGet`** URLs from API routes (or streamed buffers for admin).

## Audit actions (non-exhaustive)

| Action | When |
|--------|------|
| `document.template_created` | Admin creates template |
| `document.template_updated` | Admin updates template |
| `document.template_deleted` | Admin deletes template |
| `document.templates_seeded` | Admin seed endpoint |
| `document.generated` | Generated document created |
| `document.sent` | Marked sent to client |
| `document.admin_updated` | Admin PATCH on document |
| `document.viewed` | Client first view (SENT → VIEWED) |
| `document.signed` | Client signed; PDF stored |
| `form.assigned` | Form submission + token created |
| `form.submitted` | Client submitted form |

## Admin routes

- `/admin/contracts` — hub
- `/admin/contracts/templates` — template CRUD (API: `/api/admin/contracts/templates`)
- `/admin/contracts/generated` — list + `/new` generator + `[id]` detail (send, PDF, edit HTML)
- `/admin/contracts/releases` — filter model/property release types
- `/admin/contracts/settings` — scheduling note + seed starter templates
- `/admin/contracts/forms` — form templates, assign, submissions
- `/admin/projects/[id]/contracts` — project-scoped list + shortcuts

## Client & API routes

**Not** protected by `proxy.ts`; each handler validates **token** (and/or gallery context for lists only).

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/client/documents/[token]/view` | Idempotent view tracking |
| GET | `/api/client/documents/[token]/meta` | Load title/body for preview |
| POST | `/api/client/documents/[token]/sign` | Sign + upload signed PDF |
| GET | `/api/client/documents/[token]/pdf` | Signed PDF download |
| GET | `/api/client/forms/[token]` | Form schema |
| POST | `/api/client/forms/[token]/submit` | Submit answers |

Admin contract APIs use [`authorizeAdminRequest`](../lib/admin-auth.ts) — **not** the automation bearer by default.

## Seeding

`POST /api/admin/contracts/seed` (admin): idempotent insert of nine draft HTML templates with HTML comment disclaimer; skips existing titles. See [`lib/contracts/seed-templates.ts`](../lib/contracts/seed-templates.ts).

## Security notes

- Template HTML is rendered with placeholder replacement and **HTML-escaped** values from CRM fields (`lib/contracts/render.ts`).
- Client preview runs `sanitizeHtmlForClientPreview` to strip scripts/styles/event handlers.
- Legal copy is **operational draft only**; counsel must review before reliance.
