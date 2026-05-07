# Bright Line Studio OS — audit reference

Living artifact from the **Audit instructions vs codebase** plan. Use it for security reviews, onboarding, and incremental hardening. Regenerate route lists with `find`/`rg` when the tree changes.

---

## 1. High-risk API inventory and auth patterns

These routes are **not** behind [`proxy.ts`](../proxy.ts) admin gating. They rely on **tokens**, **webhook signatures**, **prefix allowlists**, or **client session cookies**. They deserve the deepest IDOR and abuse review.

### `app/api/client/*` (6 handlers)

| Path | Typical auth |
|------|----------------|
| `access/route.ts` | POST body `code` → `findAccessByCode`; sets `client_access` + `client_gallery` cookies |
| `validate/route.ts` | Cookie-backed validation (see `loadClientGallerySession` / client access lib) |
| `gallery/route.ts` | `loadClientGallerySession()` after cookie established |
| `favorite/route.ts` | Session-bound to gallery token context |
| `selection/route.ts` | Session-bound; selection lock when submitted |
| `download/route.ts` | Must respect `allowDownload` / `maxDownloads` on [`GalleryAccessToken`](../prisma/schema.prisma) |

**Audit focus:** every handler must resolve the access token **from the same session** as the target `galleryId` / `imageId`; no trusting raw IDs from the client without scoping to the token.

### `app/api/package/[accessToken]/*` (7 handlers)

| Path | Auth |
|------|------|
| `manifest/route.ts` | `DeliveryPackage.accessToken` unique lookup; optional `expiresAt`; logs `packageAccessLog` |
| `items/[itemId]/download/route.ts` | Token + item must belong to package |
| `track/route.ts` | Token-scoped events |
| `feedback/route.ts` | Token-scoped writes |
| `invoice/route.ts` | Token-scoped invoice exposure |
| `visual-strategy-report/route.ts` | Token-scoped read |
| `marketing-export/route.ts` | Token-scoped export |

**Audit focus:** `itemId` and nested IDs must be validated against `deliveryPackageId`; avoid 404 vs 403 information leaks if you need to harden further.

### `app/api/final-package/[token]/*` (3 handlers)

| Path | Auth |
|------|------|
| `manifest/route.ts` | `WorkProject.finalPackageToken` — opaque token on row |
| `invoice/pdf/route.ts` | Same token surface |
| `summary-pdf/route.ts` | Same token surface |

**Audit focus:** token entropy and rotation; ensure PDF routes cannot pivot to other projects if an `invoiceId` appears in the path (verify handlers scope by `WorkProject` only).

### `app/api/media/public/route.ts`

- **No admin session.** GET with `key` query param.
- **Allowlist:** prefixes only (e.g. `portfolio/`, `work/`, `studio/`, `client-galleries/`, section keys `acd|rea|…`, `thumb/`).
- Signs short-lived R2 GET URLs; optional `proxy=1` for same-origin streaming.

**Audit focus:** any new R2 prefix must be deliberate; mis-added prefix = data exposure. This is **intentional public** media, not private vault semantics.

### `app/api/cron/followups/route.ts`

- **Bearer `CRON_SECRET`** (see route: compares `Authorization` to `Bearer ${secret}`).
- If `CRON_SECRET` unset, behavior should be reviewed in-file.

**Audit focus:** secret strength; Vercel Cron / external caller must be the only invoker; idempotent job design.

### Related: automation / CMS JSON (also high-value)

Routes under **`app/api/projects/*`** and **`app/api/media/upload`**, **`app/api/media/attach-existing`** use **`requireProjectsApiAuth`** ([`lib/api/automation-auth.ts`](../lib/api/automation-auth.ts)): admin cookie **or** `Authorization: Bearer` matching `AUTOMATION_API_SECRET` and/or `BL_INTERNAL_API_TOKEN` (timing-safe compare).

Files observed with `requireProjectsApiAuth` (grep snapshot — re-verify on audit day):

- `app/api/projects/route.ts`
- `app/api/projects/[id]/route.ts`
- `app/api/projects/by-slug/[slug]/route.ts`
- `app/api/projects/create/route.ts`
- `app/api/projects/publish/route.ts`
- `app/api/projects/generate-from-brief/route.ts`
- `app/api/projects/analyze-images/route.ts`
- `app/api/projects/generate-copy/route.ts`
- `app/api/media/upload/route.ts`
- `app/api/media/attach-existing/route.ts`

### `app/api/stripe/webhook/route.ts`

- **`stripe-signature`** verification with `STRIPE_WEBHOOK_SECRET`; raw body parsing.
- Updates invoice / payment state via Prisma.

**Audit focus:** no trust of client-supplied metadata without matching Stripe object IDs in DB.

### Admin + Studio (for contrast)

- **`/api/admin/*`** and **`/studio` page + `/api/studio/*`**: gated by [`proxy.ts`](../proxy.ts) (cookie must indicate access) **and** handlers typically call **`authorizeAdminRequest`**. Defense in depth.
- Some admin routes also accept **Bearer** for automation (e.g. media upsert, automation create-project); always confirm pattern matches [`automation-auth`](../lib/api/automation-auth.ts) or bespoke timing-safe checks.

---

## 2. Brightline-specific feature / schema matrix

Use this instead of a generic SaaS checklist. Status is **architectural** (implemented in schema + routes), not a QA sign-off.

| Module | Role | Primary models | Typical routes / APIs |
|--------|------|----------------|----------------------|
| **Marketing + `/work` case studies** | Public site editorial | `WorkProject`, `MediaAsset`, `ProjectMedia`; bridges `WorkCaseStudy`, `WorkMedia`, `StudioMedia` | `app/work/*`, `app/api/admin/work-projects/*`, case study admin |
| **Studio OS — canonical project** | CRM + ops source of truth | `StudioProject`, `StudioClient`, `StudioLead` | `app/api/admin/studio-projects`, `app/api/admin/studio-clients`, `app/api/admin/studio-leads`, `app/admin/.../projects` |
| **Legacy client portal galleries** | Password / access-code flows on marketing-era schema | `Client`, `Project`, `Gallery`, `GalleryImage`, `GalleryAccessToken`, favorites, selections, logs | `app/client/*`, `app/api/client/*`, `app/galleries/*` |
| **Studio internal galleries** | Normalized proofing tied to `StudioProject` | `StudioGallery`, `StudioGalleryMedia`, `StudioMedia` | Mostly admin + future client surfaces; **do not confuse IDs** with legacy `Gallery` |
| **Delivery packages (intelligence)** | Tokened delivery manifest, feedback, invoices | `DeliveryPackage`, `DeliveryPackageItem`, `PackageAccessLog`, links to `StudioClient`, `StudioInvoice` | `app/api/package/[accessToken]/*`, admin delivery-package APIs |
| **Work-linked final package** | Simple token on published work row | `WorkProject.finalPackageToken` | `app/api/final-package/[token]/*`, `app/final-package/*` |
| **Finance** | Invoicing + payments | `StudioInvoice`, `StudioInvoiceLineItem`, `StudioPayment`, `StudioExpense`, `StudioServiceTemplate` | `app/api/studio/invoices/*`, `app/api/studio/finance/*`, admin invoice PDF / Stripe checkout |
| **Portfolio (marketing)** | Categories, published case studies | `PortfolioCategory`, `PortfolioProject`, `PortfolioImage` | `app/portfolio/*`, `app/api/admin/portfolio/*` |
| **AI generations** | Stored generations per work project | `AiGeneration` (+ OpenAI server-side) | `app/api/admin/*` generate routes, `app/api/projects/*` |
| **Automations** | Rules + run log | `AutomationRule`, `AutomationRun` (not “AutomationLog”) | `app/api/admin/settings/automation-rules/*`, n8n-facing JSON routes with bearer |
| **Email studio** | Drafts / accounts | `StudioEmailAccount`, `StudioEmailThread`, `StudioEmailMessage`, `StudioEmailDraft` | `app/api/studio/email/*` |
| **Analytics** | Snapshots | `AnalyticsSnapshot` | `app/api/admin/analytics/snapshots` (+ external ingestion) |
| **Public media proxy** | Signed R2 reads by key prefix | R2 keys only (no Prisma row) | `app/api/media/public` |

**Explicitly out of scope / N/A in current schema:** separate `Contract`, `Proposal`, `ProjectTask`, `ProjectNote`, `Contact` (CRM entity), `DeliveryEvent` (use `PackageAccessLog` / `GalleryAccessLog`), `AutomationLog` (use `AutomationRun`), `ClientPortalAccess` (use `GalleryAccessToken` / delivery `accessToken`), `AIReport` (use `AiGeneration` + admin payloads).

**Cross-wire risk:** APIs or UI that mix `Gallery.id` with `StudioGallery.id`, or `Project.id` with `StudioProject.id`, without mapping via `studioProjectId` / documented relations.

---

## 3. Authentication and automation architecture (short)

### Operator admin (dashboard + most mutations)

1. **[`proxy.ts`](../proxy.ts)** — For paths under `/admin`, `/api/admin`, `/studio` (except `/admin/login` and `/api/admin/login`), requires cookie that [**`adminCookieIndicatesAccess`**](../lib/admin-cookie.ts) accepts.
2. **Login** — POST [`/api/admin/login`](../app/api/admin/login/route.ts) with `ADMIN_ACCESS_CODE`; sets **`admin_access`** httpOnly cookie.
3. **Handlers** — Prefer **`authorizeAdminRequest(req)`** ([`lib/admin-auth.ts`](../lib/admin-auth.ts)) so Route Handlers see the same session as the proxy.

### NextAuth

- [`lib/auth.ts`](../lib/auth.ts) documents a **minimal** NextAuth setup for `/api/auth/*` compatibility; **Credentials `authorize` returns null**. Admin is **not** NextAuth-based.
- Audit any future session use separately from operator admin.

### Automation / n8n / Lightroom pipeline

- **`requireProjectsApiAuth`** — Admin cookie **or** Bearer token (`AUTOMATION_API_SECRET` and/or `BL_INTERNAL_API_TOKEN`). Implemented in [`lib/api/automation-auth.ts`](../lib/api/automation-auth.ts).
- **No `app/api/internal` tree** — automation uses **admin routes with bearer**, **`/api/projects/*`**, **`/api/media/*`** upload paths, **`/api/cron/*`**, and similar.
- **Other secrets:** `CRON_SECRET`, `SEED_TOKEN` (dev seed), Stripe webhook secret, R2 keys — each scoped to its route family.

### Client gallery session

- **Access code** flow sets **`client_access`** and **`client_gallery`** cookies ([`app/api/client/access/route.ts`](../app/api/client/access/route.ts)); downstream APIs trust **session + slug** binding from [`findAccessByCode`](../lib/client-access.ts) pattern — verify on change.

---

## 4. Fix priority ranking (default policy)

When findings conflict, use this order **in favor of the live website**:

1. **Critical — IDOR / token leaks** — `client`, `package`, `final-package`, `media/public` prefix mistakes, cross-tenant gallery or invoice exposure, predictable or enumerable tokens.
2. **High — financial integrity** — Stripe webhook correctness, invoice amounts, balance fields, checkout session tampering, PDFs leaking other clients’ data.
3. **High — automation abuse** — Missing or weak `requireProjectsApiAuth`, leaked `AUTOMATION_API_SECRET` / `BL_INTERNAL_API_TOKEN`, cron endpoints without secret.
4. **Medium — AI cost / data exfil** — Unguarded OpenAI routes, prompts receiving unsanitized PII, missing rate limits (if exposed).
5. **Medium — schema / migration safety** — `onDelete` chains between `StudioProject` and portal `Gallery`/`Project`, orphan rows, index gaps on hot FKs.
6. **Lower — admin UX / navigation** — Active nav, loading states — after security and money paths are clean.

---

## Related

- **[Internal / automation API surface](./INTERNAL_API_SURFACE.md)** — n8n and bearer-authenticated JSON routes (`/api/projects`, cron, etc.).

---

## Maintenance

- **Re-run inventory:**  
  `find app/api/client app/api/package app/api/final-package app/api/cron -name 'route.ts'` (from this package root, e.g. `brightline/`)
- **Re-run bearer usage:**  
  `rg "requireProjectsApiAuth|authorizeAdminRequest|CRON_SECRET" app/api` (from the same root)
- **Update this doc** when adding a new **public** or **token** route family.
