# Publishing — current state inventory (Phase 6A)

**Date:** 2026-08-28  
**Scope:** Brightline repository — document only; no behavior change  
**Related:** [content-current-state.md](./content-current-state.md), [ADR-007](./ADR-007-publishing-service.md)

## Executive summary

Publishing today is **not a single subsystem**. It is a set of domain-specific writes that flip boolean/status fields, push HTTP payloads to the Mirotech Content API, invalidate Next.js cache paths, or ingest assets from local tooling. There is **no deployment hook** or Vercel rebuild webhook in this repo — public visibility is achieved by database/JSON state + ISR `revalidatePath` on select admin routes.

**ContentService (Phase 5)** answers *what* content is. **Publishing (this inventory)** answers *how approved content becomes live* — currently scattered across admin API handlers and scripts.

---

## 1. Publishing mechanisms by surface

### 1.1 Brightline relational CMS (Prisma)

| Domain | Store | Publish mechanism | Auth | Public visibility trigger |
| --- | --- | --- | --- | --- |
| **WorkProject** | `work_projects` | `PATCH /api/admin/work-projects/[id]` sets `published: boolean` | `authorizeAdminRequest` | Query filters `published: true`; no `revalidatePath` on save |
| **PortfolioProject** | `portfolio_projects` | `POST/PATCH /api/admin/portfolio` sets `published`; syncs linked `StudioProject.published` | Admin | Public portfolio routes filter `published` |
| **StudioProject** (marketing) | `studio_projects` | Admin form + `POST /api/projects/publish` via `publishStudioProjectRecord()` | Admin cookie **or** automation bearer | `/work/{pillar}/{slug}` when `published` |
| **DesignProject** | `design_projects` | `PATCH /api/admin/design-projects/[id]` sets `published`, `publishedAt` | Admin | Design public routes + section `enabled` / nav flags |
| **Testimonials** | `testimonials` | Admin CRUD with `published` boolean | Admin | Public queries filter published |
| **Gallery** (client delivery) | `galleries` | `PATCH /api/admin/galleries/[id]` — `published` + `GalleryStatus` workflow | Admin | Client portal — **not** public marketing publish |
| **Legacy Project** | `projects` | `PATCH /api/admin/projects/[projectId]` | Admin | Legacy surface |

**Pattern:** Single PATCH often saves editorial fields **and** publish state together — save and publish are conflated.

### 1.2 Brightline JSON CMS (`SiteSetting`)

| Domain | Key | Publish mechanism | Cache invalidation |
| --- | --- | --- | --- |
| **Website pages** | `website_pages:v1` | `PATCH /api/admin/website-pages` — per-page `status: DRAFT \| PUBLISHED` | `revalidatePath("/", "layout")` |
| **Blog / Journal** | `blog_posts:v1` | `PATCH /api/admin/blog-posts` — `status: DRAFT \| PUBLISHED` | `revalidatePath` on `/blog`, `/travel`, sitemap |
| **Service pages** | `service_pages:v1` | `PATCH /api/admin/service-pages` | `revalidatePath("/services", "layout")` |
| **Site nav** | `site_nav:v1` | `PATCH /api/admin/site-nav` | `revalidatePath("/", "layout")` |
| **Work pillars** | `work_pillars:v1` | `PATCH /api/admin/work-pillars` — visibility/nav, not per-project publish | `revalidatePath("/", "layout")`, `/work` |

**Pattern:** Save handler persists JSON **then** revalidates — publish is immediate (sync), not a background job.

### 1.3 Cross-brand Studio Hub (Mirotech CMS via HTTP)

| Domain | Authoritative store | Write client | Admin entry |
| --- | --- | --- | --- |
| **Hub case study** | Mirotech `HubProject` | `lib/dual-brand/studio-hub.ts` → `POST/PATCH /api/content/v1/projects` | `/admin/studio-cms`, `StudioHubEditor.tsx` |
| **Hub journal** | Mirotech `HubJournalPost` | `createHubBlog` / `updateHubBlog` → project blog endpoints | Studio hub blog tab |
| **Admin passthrough** | — | `app/api/admin/studio-hub/*` | CSRF + `authorizeAdminRequest` |

**Publish dimensions (three independent toggles):**

1. `status === "PUBLISHED"` — hub record approved
2. `publishBrightline` — visible on Brightline `/work/shared/*` or linked pillar URL
3. `publishMirotech` — visible on mirotech.solutions

**Distribution helper:** `distributionStatus()` → per-target `off | draft | live`

**Deployment:** HTTP write to Mirotech Content API only — **no Brightline redeploy** required for Mirotech-only changes.

**Case study generation:** `POST /api/admin/studio-hub/generate-section-copy` — OpenAI copy assist; **not** publish (content edit only).

### 1.4 Brightline blog → Mirotech journal sync

| Aspect | Detail |
| --- | --- |
| **Trigger** | Every `PATCH /api/admin/blog-posts` after local save |
| **Client** | `lib/dual-brand/sync-journal.ts` → `POST /api/content/v1/journal/ingest` |
| **Opt-in** | `publishToMirotech` on blog post |
| **Linkage** | `mirotechJournalId` persisted back to SiteSetting |
| **Idempotency key** | `brightlinePostId` + optional `mirotechJournalId` on ingest payload |

**Pattern:** Save + cross-site publish are **conflated** in one admin PATCH handler.

### 1.5 Image / asset ingest (operational publish)

| Tool | Purpose | "Publish" meaning |
| --- | --- | --- |
| `scripts/blpublish.mjs` | prep-images + blupload to R2 + DB | Makes portfolio images available in CMS |
| `scripts/sheet-publish.mjs` | Google Sheet READY rows → R2 + DB + sheet status | Pipeline ingest, not site go-live |
| `scripts/upload-published.mjs` | Upload pre-published assets | Asset staging |
| `tools/doPost.gs` + sheet webhook | Sheet → webhook ingest | Operational pipeline |

These are **asset/content ingest**, not marketing page publish — but operators treat sheet READY → live gallery as a publish step.

### 1.6 Cache revalidation (Brightline deploy-local)

Routes calling `revalidatePath` after admin save:

- `/api/admin/blog-posts`
- `/api/admin/website-pages`
- `/api/admin/service-pages`
- `/api/admin/site-nav`
- `/api/admin/work-pillars`

**No `revalidateTag`** usage found. Work/portfolio/studio-hub saves do **not** revalidate — those pages may rely on dynamic rendering or longer cache TTL.

### 1.7 Automation publish endpoint

| Route | Purpose | Auth |
| --- | --- | --- |
| `POST /api/projects/publish` | Flip `StudioProject.published` | `requireProjectsApiAuth` — admin cookie **or** `AUTOMATION_API_SECRET` / `BL_INTERNAL_API_TOKEN` |

Designed for Studio OS / Airtable / n8n automation — synchronous DB update, returns live URL.

### 1.8 Explicitly NOT publish mechanisms

| Item | Why excluded |
| --- | --- |
| Vercel deploy hooks | Not present in repo |
| `git push` → deploy | Deployment, not content publish |
| Client gallery `SENT` / `DELIVERED` | Delivery workflow, not public site |
| Stripe webhooks | Billing, not CMS |
| `PLATFORM_ASSET_REGISTRY_ENABLED` backfill | Asset registry, not editorial publish |

---

## 2. Save vs publish conflation

| Location | Save behavior | Publish behavior | Conflated? |
| --- | --- | --- | --- |
| `work-projects/[id]` PATCH | Updates copy, media, SEO | Same request may set `published: true` | **Yes** |
| `blog-posts` PATCH | Saves all posts to SiteSetting | Sets status + triggers Mirotech sync + revalidate | **Yes** |
| `studio-hub/[id]` PATCH | Full hub payload | `status`, `publishBrightline`, `publishMirotech` in same body | **Yes** |
| `portfolio` PATCH | Images, metadata | `published` + StudioProject sync | **Yes** |
| `website-pages` PATCH | Page content | `status` field in same array save | **Yes** |
| `design-projects` PATCH | Project fields | `published` + `publishedAt` | **Yes** |

**No separate "Publish" API** exists for WorkProject or Portfolio — only boolean on save. StudioProject has a dedicated `/api/projects/publish` in addition to admin form saves.

---

## 3. Publish targets (actual architecture)

| Target ID | Tenant | Runtime | How content goes live |
| --- | --- | --- | --- |
| **`brightline-site`** | `brightline` | This Next.js deploy (Vercel) | Prisma/SiteSetting state + optional `revalidatePath` |
| **`mirotech-site`** | `mirotech` | Separate Next.js deploy | Bearer-authenticated Content API writes from Brightline admin |

There is no third "CDN-only" target — R2 objects become public via `/api/media/public` when referenced by published content, not via a separate publish step.

---

## 4. Cross-site coupling

| Flow | Source | Destination | Coupling type |
| --- | --- | --- | --- |
| Studio Hub save | Brightline admin | Mirotech CMS DB | HTTP write (authoritative on Mirotech) |
| Blog save + sync | Brightline SiteSetting | Mirotech JournalPost | HTTP ingest on every blog PATCH |
| Dual-brand work read | Brightline public `/work` | Mirotech Content API | Read-only HTTP |
| Portfolio → StudioProject | Brightline Prisma | Same DB | FK sync on portfolio save |
| `brightlineExternalId` | Hub project | Studio CMS editor link | String reference, not FK |

**No cross-site database FKs.** Linkage is string IDs + HTTP.

---

## 5. Authorization boundaries

| Surface | Gate |
| --- | --- |
| Admin CMS routes | `authorizeAdminRequest` (session cookie) |
| Admin mutations | `rejectCrossSiteMutation` (CSRF) on many routes |
| Studio hub | Bearer `CONTENT_API_SECRET` / handoff secrets (server-to-server) |
| `/api/projects/publish` | Admin session **or** automation bearer |
| Public routes | No publish — read only |
| Mirotech Content API | Bearer auth (configured on Mirotech deploy) |

**No unauthenticated publish endpoint** in this repository.

---

## 6. Idempotency notes (observed, not fixed)

| Operation | Safe to repeat? | Risk |
| --- | --- | --- |
| Set `published: true` when already true | Yes | None |
| Set `published: false` when already false | Yes | None |
| `revalidatePath` | Yes | Extra cache churn only |
| Hub `PATCH` with unchanged payload | Likely yes | Depends on Mirotech API |
| `syncBlogPostToMirotech` upsert | Mostly yes | Uses `brightlinePostId` / `mirotechJournalId` |
| `sheet-publish.mjs` READY rows | **Risk** | May re-upload / duplicate if status not updated |
| Hub `POST` create project | **No** | Creates duplicate if retried without idempotency key |
| Portfolio create + StudioProject bootstrap | **Partial** | Slug collision checks exist; retry may fail differently |

---

## 7. Async / job model today

**All publish paths observed are synchronous** in the request handler:

- DB update completes before HTTP response
- Mirotech sync awaited inline in blog PATCH (errors logged, partial success returned)
- No `jobId`, queue, or poll status in production publish flows

Phase 7 may introduce background jobs; Phase 6A contract does not require `getStatus`.

---

## 8. Platform flag

| Env | Default | Purpose |
| --- | --- | --- |
| `PLATFORM_PUBLISHING_ENABLED` | `false` | Reserved for future `DefaultPublishingService` routing |

No runtime consumer uses this flag in Phase 6A.
