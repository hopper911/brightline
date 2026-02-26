# Site audit — Bright Line Photography

Audit for luxury commercial photography site upgrade. Matches actual codebase state.

## Routes

### Marketing
- `app/page.tsx` — Home
- `app/work/page.tsx` — Work index
- `app/work/[section]/page.tsx` — Pillar listing (architecture, campaign, corporate)
- `app/work/[section]/[projectSlug]/page.tsx` — Project detail
- `app/about/page.tsx` — About
- `app/contact/page.tsx` — Contact
- `app/services/page.tsx` — Services index
- `app/services/[slug]/page.tsx` — Service detail
- `app/process/page.tsx` — Process
- `app/terms/page.tsx` — Terms
- `app/privacy/page.tsx` — Privacy

### Portfolio
- `app/portfolio/page.tsx` — Redirects to `/work`
- `app/portfolio/[category]/page.tsx` — Legacy (no nav links)
- `app/portfolio/[category]/[slug]/page.tsx` — Legacy

### Client portal
- `app/client/page.tsx` — Client entry
- `app/client/[gallerySlug]/page.tsx` — Gallery by slug
- `app/client/access/[token]/view.tsx` — Token-based gallery view

### Admin
- `app/admin/page.tsx` — Admin dashboard
- `app/admin/login/` — Login
- `app/admin/portfolio/` — Portfolio (legacy taxonomy)
- `app/admin/galleries/` — Galleries
- `app/admin/projects/` — Projects
- `app/admin/leads/` — Leads
- `app/admin/testimonials/` — Testimonials
- `app/admin/tags/` — Tags
- `app/admin/settings/` — Settings

## Key components

- **Hero / nav / footer:** `components/HomeHero.tsx`, `components/Navbar.tsx`, `components/Footer.tsx`
- **Marketing:** `components/WorkCard.tsx`, `components/Reveal.tsx`, `components/PrimaryCTA.tsx`, `components/VideoEmbed.tsx`

## Where categories/sections are defined

- **Public work:** `lib/portfolioPillars.ts` — 3 pillars: `architecture`, `campaign`, `corporate` (maps to Prisma `WorkSection`: REA/TRI→architecture, ACD/CUL→campaign, BIZ→corporate). Nav is built from `PILLARS`.
- **Admin portfolio (legacy):** `app/admin/portfolio/page.tsx` — `CATEGORY_OPTIONS`: commercial-real-estate, architecture, fashion, culinary, graphic-design (different from work sections).

## Homepage sections (source)

All defined in code in `app/page.tsx`:

- Hardcoded `featured` — Work cards linking to `/work/{architecture|campaign|corporate}` with local image paths
- `services` — 4 service cards
- `testimonials` — 2 quotes
- `whatYouGet`, `howItWorks` — copy blocks
- `CREDIBILITY` — from `lib/config/credibility.ts`

Sections rendered: Hero, Featured Work (5 cards), The Approach (about CTA), What you get, How it works, Services (4 cards), Testimonials + CTA, Let’s collaborate CTA. No database for homepage content.

## Images and metadata

- **Work system:** `lib/r2.ts` — `getPublicR2Url(key)`. DB stores R2 keys (`MediaAsset.keyFull`, `posterKey`); URLs built at render. Used in work pages and `components/VideoEmbed.tsx`.
- **Homepage / static:** Local paths in `app/page.tsx` (e.g. `/images/real-estate.jpg`, `/images/design.jpg`) and `components/HomeHero.tsx`; some from `app/services/data.ts`.
- **Client galleries:** `GalleryImage.url`, `thumbUrl`, `fullUrl`; admin upload pipeline uses R2 and API routes.

## Published / featured flags

| Model          | published | featured | sortOrder |
|----------------|-----------|----------|----------|
| WorkProject    | yes       | no       | no       |
| Gallery        | yes       | no       | no       |
| Project (client) | yes     | yes      | —        |
| PortfolioProject | yes     | —        | —        |
| MediaAsset     | —         | —        | —        |

- **Work:** `lib/queries/work.ts` orders by `year desc`, `createdAt desc`; no `isFeatured` or `sortOrder` on WorkProject.
- **Gallery:** no `isFeatured` or `sortOrder`.
