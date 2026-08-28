# Current Architecture State (Phase 0 Inventory)

**Document date:** 2026-08-28  
**Repository:** `brightline/` (Brightline Photography Next.js application)  
**Production origin:** `https://brightlinephotography.com` (also redirects from `.co` via `vercel.json`)  
**Related deploy:** MiroTech Solutions at `https://mirotech.solutions` (separate Next.js app; integrated via HTTP APIs and shared infra)

This document describes **what exists today**. It is observational only — not a target architecture.

---

## 1. Current architecture overview

```
┌─────────────────────────────────────────────────────────────────┐
│  brightlinephotography.com (Vercel Hobby, Node 20)              │
│  Next.js 16 App Router · TypeScript · Tailwind 4                │
├─────────────────────────────────────────────────────────────────┤
│  Public marketing · Work · Galleries · Journal · Client delivery│
│  /admin · /studio · /accountant · /client (private surfaces)    │
├─────────────────────────────────────────────────────────────────┤
│  proxy.ts — CSP nonce, admin CSRF, admin cookie gate            │
│  ~272 Route Handlers under app/api/                             │
├──────────────┬──────────────────────┬───────────────────────────┤
│ Neon Postgres│ Cloudflare R2 (2 vaults)│ External services        │
│ Prisma 5     │ brightline + mirotech │ Resend, Stripe, OpenAI   │
└──────────────┴──────────────────────┴───────────────────────────┘
         │                    │                    │
         │                    │                    ▼
         │                    │         mirotech.solutions (separate deploy)
         │                    │         Content API + admin handoff
         └────────────────────┴────────────────────────────────────
```

**Stack (from `package.json` and `lib/truth/site-state.ts`):**

| Layer | Technology |
| --- | --- |
| Framework | Next.js `^16.2.12`, React 19, App Router |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| ORM / DB | Prisma 5.22, Neon Postgres (`DATABASE_URL`, `DIRECT_URL`) |
| Object storage | Cloudflare R2 via `@aws-sdk/client-s3` and `aws4fetch` |
| Hosting | Vercel (Hobby tier on production) |
| Auth (admin) | Signed cookie (`admin_access`) + access code |
| Auth (other) | NextAuth route exists; accountant JWT; client gallery HMAC sessions |
| Tests | Vitest (`npm test`), Playwright e2e |
| Lint | ESLint 9 (`npm run lint`) |

**Frozen baseline:** Executable locks in `lib/truth/` (`site-state.ts`, `public-chrome.ts`, `security.ts`, `brand-lock.ts`, `truth.test.ts`).

---

## 2. Application boundaries

### Brightline (this repository)

Single Next.js monolith serving:

- **Public:** home, Work case studies, Galleries, Services, About, Contact, Journal, optional Design section (CMS-gated), token packages (`/package/*`, `/final-package/*`).
- **Operator:** `/admin` (Mission Control), `/studio` (Studio OS CMS), `/accountant`, `/client` portal.

App structure follows App Router conventions:

- `app/` — pages and ~272 API routes
- `components/` — UI
- `lib/` — domain logic, integrations, guards
- `prisma/` — schema (59 migrations as of inventory), seed
- `scripts/` — local tooling, deploy helpers, R2/CMS batch jobs
- `tools/` — sheet webhook, Mirotech verification scripts

### MiroTech Solutions (external deploy)

Not merged into this repo. Brightline integrates via:

- **`lib/dual-brand/content-api.ts`** — read published Work/Journal content from Mirotech Content API
- **`lib/dual-brand/studio-hub.ts`** — Studio Hub client pushing case studies / journal to Mirotech admin APIs
- **`lib/mirotech-admin-handoff.ts`** — HMAC handoff tokens for cross-site admin navigation
- **`lib/r2-vaults.ts`** — second R2 bucket (`mirotech-site`) managed from Brightline admin R2 tools

Mirotech maintains its own Postgres schema and public site; Brightline does **not** import Mirotech Prisma models directly.

---

## 3. Database access patterns

- **Client:** `lib/prisma.ts` exports a shared `PrismaClient` singleton.
- **Schema:** Large unified schema (~2,100+ lines) covering Brightline photography, Studio OS, Mission Control, galleries, deliveries, accountant portal, audit tables, etc.
- **Migrations:** `prisma/migrations/` — additive history; deploy via `npm run db:migrate` (`scripts/prisma-with-local-env.mjs migrate deploy`).
- **Seed:** `prisma/seed.js` — Studio OS demo client/project, service templates (CommonJS).
- **No platform tenant table** existed before Phase 1A (`PlatformTenant` / `platform_tenants` added additively).

Major model groups (non-exhaustive):

| Domain | Examples |
| --- | --- |
| Public Work | `WorkProject`, `WorkGallery`, portfolio placement |
| Studio OS | `StudioClient`, `StudioProject`, tasks, finance |
| Client delivery | `Gallery`, `GalleryImage`, `DeliveryPackage`, `FinalPackage` |
| Mission Control | email, follow-ups, health snapshots |
| Accountant | `AccountantAccess`, audit events |
| CMS settings | `SiteSetting`, design section |

Cross-brand linkage uses string fields and external IDs (e.g. `brightlineExternalId`, `publishMirotech`) rather than shared platform FKs.

---

## 4. Media / storage access patterns

### R2 dual-vault model (`lib/r2-vaults.ts`, `lib/r2-vaults-shared.ts`)

| Vault ID | Purpose | Env prefix |
| --- | --- | --- |
| `brightline` | Photography assets, deliveries, portfolio | `R2_*` |
| `mirotech-site` | Mirotech public site media (managed from Brightline admin) | `MIROTECH_R2_*` |

Core helpers: `lib/r2.ts`, `lib/r2-upload-destination.ts`, `lib/r2-browser-prefixes.ts`.

### Admin R2 API surface (`app/api/admin/r2/*`)

Upload URLs, multipart, list, move, delete, sign, usage, rewrite-refs, compact tools — **15 route files**.

### Asset reference tracking

- `lib/admin-r2-brightline-media-refs.ts`, `lib/admin-r2-mirotech-cms-keys.ts`
- `lib/asset-health/registry.ts` — unified CMS/DB reference collection (in progress for media control center)

### Public delivery

R2 keys stored on models; public URLs built from `R2_PUBLIC_URL` / `NEXT_PUBLIC_R2_PUBLIC_URL` (and Mirotech equivalents).

**Critical constraint:** Existing object keys and bucket paths must remain valid — no automatic migration of production files.

---

## 5. Authentication flow

### Admin (`/admin`, `/api/admin`, `/studio`, `/api/studio`)

1. Login at `/admin/login` with access code → signed `admin_access` cookie (`lib/admin-session.ts`, `lib/admin-cookie.ts`).
2. `proxy.ts` checks cookie on operator paths; unauthenticated API calls return 401 JSON.
3. CSRF: `rejectCrossSiteMutation` on mutating admin/studio/accountant/AI routes (`lib/truth/security.ts`).
4. Route handlers use `authorizeAdminRequest()` from `lib/admin-auth.ts`.

### Mirotech admin handoff

- `POST /api/admin/mirotech/handoff` creates short-lived HMAC token (`lib/mirotech-admin-handoff.ts`).
- Redirects operator to `mirotech.solutions/admin/...` with `?handoff=`.
- Secrets: `MIROTECH_ADMIN_HANDOFF_SECRET` or `ADMIN_HANDOFF_SECRET`.

### Accountant portal

- JWT session (`lib/accountant/jwt.ts`, `ACCOUNTANT_SESSION_SECRET`).
- Owner admin cookie can also authorize.

### Client gallery

- HMAC session tokens (`lib/client-gallery-session-token.ts`, `CLIENT_GALLERY_SESSION_SECRET`).

### NextAuth

- Route at `app/api/auth/[...nextauth]/route.ts` — present but not the primary admin gate.

---

## 6. Cross-application dependencies

| Integration | Brightline module | Remote system | Auth |
| --- | --- | --- | --- |
| Content read | `lib/dual-brand/content-api.ts` | Mirotech Content API | `CONTENT_API_SECRET` (optional Bearer) |
| Studio Hub publish | `lib/dual-brand/studio-hub.ts` | Mirotech admin hub APIs | Same secret family |
| Admin navigation | `lib/mirotech-admin-handoff.ts` | Mirotech `/admin` | HMAC handoff token |
| Shared media | `lib/r2-vaults.ts` | Mirotech R2 bucket | S3 credentials on Brightline |
| Journal sync | `lib/dual-brand/sync-journal.ts` | Mirotech | Content API |

Env URLs: `MIROTECH_CONTENT_API_URL`, `MIROTECH_SITE_URL` / `NEXT_PUBLIC_MIROTECH_SITE_URL`, `mirotechSiteOrigin()` in `lib/mirotech-site.ts`.

**Coupling risk:** Brightline admin directly operates both R2 vaults and calls Mirotech HTTP APIs — no neutral platform layer yet.

---

## 7. Publishing flow

Multiple paths coexist:

1. **Brightline Work / portfolio** — Prisma `WorkProject` publish flags, public `/work/*` routes.
2. **Studio OS → case study** — `StudioProject` lifecycle through statuses including `PUBLISHED`; may link to Work.
3. **Studio Hub → Mirotech** — `lib/dual-brand/studio-hub.ts` pushes case studies and journal posts to Mirotech when `publishMirotech` is set.
4. **Sheet pipeline** — Google Apps Script webhook (`tools/doPost.gs`) + `scripts/sheet-publish.mjs`, `scripts/blpublish.mjs` (legacy ingest path).
5. **Design portfolio** — separate CMS models gated by `lib/feature-flags.ts`.

Publishing is **not** centralized; each path owns its transaction boundaries.

---

## 8. Important environment variables (names only)

### Database

- `DATABASE_URL`, `DIRECT_URL`

### Brightline R2

- `R2_ENDPOINT`, `R2_REGION`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
- `R2_PUBLIC_URL`, `NEXT_PUBLIC_R2_PUBLIC_URL`

### Mirotech R2 (from Brightline)

- `MIROTECH_R2_*` (access key, secret, bucket, endpoint, region, public URL)
- `NEXT_PUBLIC_MIROTECH_R2_PUBLIC_URL`

### Cross-brand / Mirotech HTTP

- `MIROTECH_CONTENT_API_URL`, `CONTENT_API_SECRET`
- `MIROTECH_ADMIN_HANDOFF_SECRET`, `ADMIN_HANDOFF_SECRET`
- `MIROTECH_SITE_URL`, `NEXT_PUBLIC_MIROTECH_SITE_URL`

### Admin / sessions

- `ADMIN_ACCESS_CODE`, `ADMIN_SESSION_SECRET`
- `CLIENT_GALLERY_SESSION_SECRET`
- `ACCOUNTANT_SESSION_SECRET`

### Platform (Phase 1A — default off)

- `PLATFORM_CONTENT_ENABLED`, `PLATFORM_MEDIA_ENABLED`, `PLATFORM_PUBLISHING_ENABLED`, `PLATFORM_IDENTITY_ENABLED`, `PLATFORM_JOBS_ENABLED`

### Email / payments / AI

- `RESEND_API_KEY`, `RESEND_FROM`, `CONTACT_NOTIFY_EMAIL`
- `STRIPE_*` (invoicing routes)
- `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_VISION_MODEL`

### Observability / ops

- `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_ENABLE`
- `CRON_SECRET` (cron route guard)
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (rate limits)

### Site / analytics

- `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `NEXT_PUBLIC_GA_ID`

### Vercel / build

- `VERCEL`, `VERCEL_ENV`, `NODE_ENV`

---

## 9. High-risk coupling points

1. **Dual R2 vault credentials on Brightline** — Mirotech media lifecycle depends on Brightline env and admin UI.
2. **Studio Hub HTTP client** — publish failures or API drift break cross-brand case studies/journal.
3. **Shared Neon database** — single Prisma schema serves Brightline + Studio OS; Mirotech DB is separate but content IDs must stay aligned.
4. **Handoff secret rotation** — must stay in sync across both deploys.
5. **Direct R2 key strings in CMS JSON** — move/rename in R2 requires CMS rewrite (`rewrite-refs` tooling).
6. **Vercel Hobby limits** — bulk R2 operations through API routes consume Fast Origin Transfer.
7. **Google Sheet webhook** — formula columns must not be overwritten (`tools/doPost.gs` contract).

---

## 10. Safe migration seams

| Seam | Notes |
| --- | --- |
| `lib/platform/*` (Phase 1A–1B) | Tenant registry, resolver, PlatformContext; no legacy wiring yet |
| `lib/r2-vaults.ts` | Natural wrapper point for future `MediaService` |
| `lib/dual-brand/*` | Content/publish adapters behind future platform services |
| `lib/feature-flags.ts` | Existing CMS gates — separate from platform flags |
| `lib/truth/*` | Frozen contracts — extend via new modules, don't weaken |
| Additive Prisma `platform_*` tables | No FK to legacy until backfill strategy approved |
| Env-gated `PLATFORM_*_ENABLED` | Strangler routing without removing legacy paths |
| Local scripts (`scripts/execute-mirotech-r2-reorg.ts`) | Prefer direct R2/DB for bulk work vs production API |

---

## 11. Current brand / application resolution

How the codebase determines **which brand or site** an operation relates to today (legacy — not yet unified through `PlatformContext`).

### Brightline deploy identity

This repository **is** the Brightline Photography application. There is no runtime switch that turns the same deploy into MiroTech.

| Mechanism | Location | Behavior |
| --- | --- | --- |
| Frozen canonical origin | `lib/truth/brand-lock.ts` → `CANONICAL_SITE_ORIGIN` | `https://brightlinephotography.com` |
| Public brand config | `lib/config/brand.ts` → `BRAND.url` | Same origin; sibling link to Mirotech |
| Site URL override | `NEXT_PUBLIC_SITE_URL` | Used by sitemap, robots, Stripe checkout, studio URLs, journal sync when set |
| Host redirects | `vercel.json` | `.co` and `www` → `brightlinephotography.com` |
| CSP / image hosts | `lib/csp.ts`, `lib/r2.ts` | Allowlists include Brightline + Mirotech CDN domains |

The Brightline app does **not** inspect `Host` to choose between Brightline and Mirotech public sites. It always serves Brightline surfaces.

### Mirotech as external application

| Mechanism | Location | Behavior |
| --- | --- | --- |
| Site origin helper | `lib/mirotech-site.ts` → `mirotechSiteOrigin()` | `MIROTECH_SITE_URL` / `NEXT_PUBLIC_MIROTECH_SITE_URL` or default `https://mirotech.solutions` |
| Content API base | `lib/dual-brand/content-api.ts` | `MIROTECH_CONTENT_API_URL` or default `https://mirotech.solutions` |
| Admin handoff target | `lib/mirotech-admin-handoff.ts` | Redirects to Mirotech `/admin` with HMAC token |
| Hard-coded preview URLs | `StudioHubEditor.tsx`, `admin-media-library.ts`, blog client | Build `https://mirotech.solutions/work/...` and journal links |

Mirotech public routes are **not** rendered by this deploy; they are linked or fetched via HTTP.

### Dual-brand CMS fields (Studio Hub / journal)

| Field | Values | Usage |
| --- | --- | --- |
| `primarySite` | `BOTH`, `BRIGHTLINE`, `MIROTECH` | Journal/case-study publish target in Studio Hub (`lib/dual-brand/studio-hub.ts`) |
| `publishMirotech` / `publishBrightline` | boolean flags on hub projects | Controls cross-brand publish from admin |
| `brightlineSection` + slug | string | Brightline Work URL path segment |

These are **content routing** flags, not application tenant context for the whole request.

### R2 vault → brand (storage, not HTTP host)

| Vault ID | Owner brand | Module |
| --- | --- | --- |
| `brightline` | Brightline Photography | `lib/r2-vaults.ts` |
| `mirotech-site` | MiroTech Solutions (operated from Brightline admin) | `lib/r2-vaults.ts` |

Vault selection is explicit in admin R2 tools — not derived from request hostname.

### Platform tenant layer (Phase 1B — beside legacy)

New modules in `lib/platform/` provide canonical resolution **without replacing** the above:

- `resolveTenantBySlug('brightline' | 'mirotech')` — throws on unknown
- `resolveTenantByHostname(host)` — maps apex/www + `.co` alias; `null` for unknown
- `createPlatformContextForTenant(slug)` — typed `{ tenant: TenantConfig }`
- `resolveTenantFromRequest(request)` — server-only Host header helper

No production route imports these helpers yet.

### Gaps / migration targets

- Hard-coded `https://brightlinephotography.com` and `https://mirotech.solutions` strings in admin UI
- `primarySite` enum strings parallel but not identical to `TenantSlug`
- `tenantSlugFromLegacySite()` bridges vault/CMS labels → platform slugs for future migration

---

## Appendix: Other inventory notes

- **Middleware:** `proxy.ts` (not `middleware.ts` naming in Next 16 setup).
- **Cron:** `vercel.json` → `/api/cron/followups` daily 14:00 UTC.
- **Background jobs:** No dedicated queue (Inngest/Trigger.dev) — cron + synchronous API handlers + local scripts.
- **Logging:** Optional Sentry (`lib/monitoring/sentry.ts`); console logging elsewhere.
- **Existing feature flags:** `lib/feature-flags.ts` — Design portfolio and résumé page CMS gates only.
- **Tests:** Vitest across `lib/**/*.test.ts`; truth module tests must stay green.
