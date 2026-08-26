# Brightline Design & Digital — Repository Audit (Stage 1)

**Audited:** 2026-08-03  
**App root:** `brightline/`  
**Canonical production origin:** `https://brightlinephotography.com`  
**Decisions:** Keep core nav (1A); extend existing `DesignProject` (2A); public Design stays behind `design_section:v1` until launch.

---

## 1. Framework and package versions

| Package | Declared |
| --- | --- |
| next | ^16.2.12 |
| react / react-dom | 19.2.3 |
| @prisma/client / prisma | ^5.22.0 |
| tailwindcss | ^4.1.18 |
| typescript | ^5 |
| vitest | ^2.0.0 |
| zod | ^3.24.4 |
| resend | present |
| next-auth | ^4.24.15 (stub only; not used for admin) |
| framer-motion | 11.11.17 |
| @aws-sdk/client-s3 | R2 uploads |

**Engines:** `node: "20.x"`  
**Deploy:** Vercel (`vercel.json`, `scripts/deploy-prod.sh`)  
**Scripts:** `lint` (eslint), `test` (vitest run), `build` (`prisma generate && next build --webpack`). **No dedicated `typecheck` script.**

### Quality gate snapshot (Stage 1)

| Command | Result |
| --- | --- |
| `npm run lint` | Fail — ~45 errors / 126 warnings (many in scripts / vendored wasm) |
| `npm test` | Fail — 3 failing tests (`admin-session`, `contracts-forms`); 65 passing |
| `npx tsc --noEmit` | Fail — ~592 errors (scripts + schema drift); build uses `typescript.ignoreBuildErrors: true` |

These are pre-existing; Stage 1 does not fix them.

---

## 2–5. Route maps

### Public marketing / delivery

- `/`, `/about`, `/contact`, `/services`, `/services/[slug]`
- `/work`, `/work/[section]`, `/work/[section]/[projectSlug]`
- `/galleries`, `/galleries/[slug]`
- `/design`, `/design/[slug]` (**CMS-gated**; `notFound()` when disabled)
- `/blog`, `/blog/[slug]`, `/travel`, `/travel/[slug]`
- `/case-studies`, `/case-studies/[slug]`, `/portfolio/...`
- SEO landings: architecture / commercial / corporate / real-estate photographer pages
- `/package/[accessToken]`, `/final-package/[token]`, `/delivery/[publicSlug]`
- `/process`, `/privacy`, `/terms`
- Catch-alls: `/[slug]`, `/[slug]/[projectSlug]`
- Redirects: `/client-access`, `/client_access` → `/client`

### Admin (`/admin`)

Login + Mission Control: analytics, automations, blog, business, clients, contracts, delivery, **design**, galleries, leads, media, navigation, pages, portfolio, projects, r2, services, settings, studio-leads, tags, testimonials, work, work-pillars, work-sections, etc.

### Client / Studio / Accountant

- `/client`, `/client/[gallerySlug]`, documents, forms
- `/studio` (calendar, finance, tasks, invoices)
- `/accountant` (+ login, documents, expenses, invoices, payments, receipts, reports, settings, transactions)

---

## 6. Authentication architecture

| Surface | Mechanism | Key files |
| --- | --- | --- |
| Admin + Studio | Shared access code → HMAC cookie `admin_access` | `lib/admin-session.ts`, `lib/admin-auth.ts`, `app/api/admin/login` |
| Accountant | Email/password → JWT cookie; or admin owner | `lib/accountant/*` |
| Client gallery | Access code → HMAC cookie | `lib/client-access.ts`, `lib/client-gallery-session*` |
| Delivery | URL tokens on packages / final package | `app/package/*`, `lib/final-package-access.ts` |
| Edge | CSRF + session redirects | `proxy.ts` |

NextAuth in `lib/auth.ts` is a stub (credentials always null).

---

## 7. Database models (Prisma)

**Schema:** `prisma/schema.prisma`

**Relevant for this expansion:**

- `DesignProject` — public design portfolio (already exists)
- `WorkProject` / `ProjectMedia` / `MediaAsset` — photography Work
- `StudioProject` / Studio CRM-finance models — Studio OS (flagship case-study subject)
- `SiteSetting` — JSON CMS bag
- `Inquiry` — contact form
- `Gallery*` — client galleries
- `DeliveryPackage*` — client delivery

**Drift risk:** Migrations create Accountant / Document / Form / StudioActivityLog tables used in code but **missing from checked-in `schema.prisma`**. Live Neon may be ahead of the file. Additive DesignProject changes must not require rewriting those missing models.

Studio `ProjectStatus` enum already exists for photography/studio lifecycle — **must not overload** for design portfolio status (use a separate enum).

---

## 8. Media / R2

- Client: `lib/storage-r2.ts`, public URLs `lib/r2.ts`
- Prefix policy: `lib/media-key-access.ts`
- Serve: `/api/media/public`
- Design covers use `MediaAsset` relation `DesignCover`
- Specimens: JSON `specimenBlocks` with R2 keys

Do not store large blobs in Postgres.

---

## 9–10. Portfolio / CMS architecture

| Concern | Storage |
| --- | --- |
| Photography Work | `WorkProject` + `work_pillars:v1` |
| Design portfolio | `DesignProject` + `design_section:v1` |
| Website pages | `website_pages:v1` block CMS |
| Nav | `site_nav:v1` (+ core label/href lock) |
| Blog | `blog_posts:v1` |
| Theme | `site_theme:v1` |

**Recommended approach:** Extend `DesignProject` additively; keep gate defaults `enabled: false`.

---

## 11. Design tokens

- Charcoal/black photographic base + white type (`app/globals.css`, `lib/site-theme.ts`)
- **No gold `#C9A86A` in repo** — do not introduce without explicit brand change
- Fonts: Inter body, Montserrat display
- Brand assets: monogram + wordmark under `/brand/`

---

## 12. Shared layout

- `app/AppShell.tsx` → `Navbar` + `Footer`
- Design nav injection: `applyDesignNavToSiteNav` when section enabled + `showInNav`
- Homepage band: `DesignEntryBand` (gated)

---

## 13. SEO

- `app/sitemap.ts` — includes design slugs only when section enabled
- `app/robots.ts` — disallow `/admin`, `/client`, `/api`
- Per-route `generateMetadata` on design pages
- `metadataBase` from site URL / `BRAND.url`

---

## 14. Analytics

- `components/Analytics.tsx` — Plausible and/or GA4 via env
- `lib/analytics.ts` — contact/booking events
- `EngagementEvent` for packages/galleries
- Admin `AnalyticsSnapshot`

---

## 15. Contact form

- UI: `app/contact/ContactPageClient.tsx`
- API: `app/api/contact` → `lib/services/contact.ts` → `Inquiry` + Resend
- Inquiry types already include photography / digital / employment
- Spam: honeypot + rate limit; **Turnstile env documented but not wired**

---

## 16. Feature-flag strategy

Primary gate: `design_section:v1` (`enabled`, `showInNav`, `showOnHome`, `showOnWorkHub`, `showOnAbout`, `showInFooter`).

Also: nav item `visible`, work pillar `visible`.

No `FEATURE_*` env module yet — plan adds thin `lib/feature-flags.ts` wrapping SiteSettings (resume page, etc.) without flipping production defaults.

---

## 17. Mobile navigation

Sticky `Navbar` with CMS items; Design appears only when enabled + showInNav. Core items locked for labels/hrefs; SHOW editable.

---

## 18–20. Broken / incomplete / placeholders

| Area | Notes |
| --- | --- |
| Design public | Hidden by default — intentional |
| Placeholders | Stripped via `isPublicPlaceholderCopy` / `sanitizePublicStatItem` |
| “Select Case studies” | Hidden from public stats |
| Corporate pillar | Restored in prod CMS previously |
| Empty social | `BRAND.social.instagram` / `linkedin` empty |
| No `/resume` | To add behind flag |
| Schema drift | Accountant/contracts models missing from schema file |
| TS ignore on build | `next.config.ts` |

---

## 21. Technical debt affecting this work

1. `typescript.ignoreBuildErrors: true`
2. Prisma schema incomplete vs migrations
3. Dual project systems (WorkProject / StudioProject / DesignProject / legacy Portfolio)
4. Failing vitest suites unrelated to Design
5. Lint noise from scripts / ffmpeg wasm

---

## 22. Risks

| Risk | Mitigation |
| --- | --- |
| Accidental Design launch | Keep `enabled: false`; seed `published: false` |
| Schema migrate breaks prod | Additive columns + new enum only; deploy migration before code that requires fields |
| Nav / SEO churn | No photography route renames; no core nav label changes |
| Invented metrics in case studies | Seed factual scaffolding only; admin TODO never public |
| MiroTech branding | Never mention publicly |
| Overload `ProjectStatus` | Use `DesignPortfolioStatus` |

---

## 23. Recommended migration approach

1. Additive Prisma migration on `DesignProject` + `DesignPortfolioStatus`
2. Extend admin editor + public queries/components
3. Seed six drafts unpublished
4. Upgrade `/design` + case-study layout behind gate
5. Add `/resume` behind flag; soft About/contact/homepage enhancements gated
6. Gradual flag flip: admin → URL → nav → homepage → indexing

---

## 24. Files expected to change (later stages)

- `prisma/schema.prisma` + new migration
- `lib/design-section-settings.ts`, `lib/queries/design.ts`, new `lib/design/*`, `lib/feature-flags.ts`
- `app/design/**`, `app/admin/(dashboard)/design/**`, `app/api/admin/design-projects/**`
- `components/design/**`, `components/DesignEntryBand.tsx`, homepage/About/contact/resume
- `docs/*` expansion docs
- Seed script under `scripts/`

## 25. Must remain untouched (unless explicit ask)

- Photography Work pipeline, galleries, client access, delivery packages
- Studio OS / accountant core
- R2 credentials / env values
- Google Sheet formula tooling
- Core nav brand wording (`BRIGHTLINE` + `PHOTOGRAPHY`)
- Truth locks for labels/hrefs (visibility remains CMS-editable)

---

## Audit footer

| Item | Value |
| --- | --- |
| **Recommended next stage** | Stage 2 — public QC cleanup report + Critical/High fixes if any remain |
| **Files expected to change** | See §24 |
| **Database impact** | Additive `DesignProject` fields + `DesignPortfolioStatus` enum; no destructive migrations |
| **Route impact** | Reuse `/design`, `/design/[slug]`; add `/resume` (flagged); no `/work` renames |
| **Deployment risk** | Low while `design_section.enabled === false`; medium only when flags flip |
| **Rollback approach** | Disable design_section flags; unpublish projects; leave additive columns inert |
| **Open content requirements** | Real product screenshots, honest statuses, résumé PDF, LinkedIn/GitHub URLs when ready, case-study copy without invented metrics or MiroTech mentions |
