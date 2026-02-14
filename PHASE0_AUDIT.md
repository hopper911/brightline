# Phase 0 — Repo Audit

## 1. App Router Structure

```
app/
├── layout.tsx          # Root: Navbar, PageTransition, Footer, Analytics
├── page.tsx            # Homepage
├── about/page.tsx
├── contact/
│   ├── layout.tsx      # metadata only
│   └── page.tsx        # Client form
├── services/
│   ├── page.tsx
│   └── [slug]/page.tsx # Service detail (hospitality, commercial-real-estate, fashion)
├── work/
│   ├── page.tsx        # Work index (merges portfolio + content)
│   ├── work-hub.tsx    # Shared work grid
│   ├── [segment]/page.tsx        # Single-segment: /work/fashion-01 (content projects)
│   └── [segment]/[slug]/page.tsx # Two-segment: /work/fashion/fashion-01 (portfolio + content)
├── portfolio/
│   ├── page.tsx        # Portfolio index
│   └── [category]/[slug]/page.tsx # Redirect to /work/...
└── client/[gallerySlug]/page.tsx  # Client portal gallery (noindex)
```

## 2. Key Layout Components

- **Navbar.tsx** — Sticky header, nav links (Work, Services, About, Contact), mobile menu
- **Footer.tsx** — Copyright, email, Client Access link
- **PageTransition** — Wraps children
- **Reveal** — Scroll/animation wrapper (framer-motion)

## 3. Portfolio & Gallery

- **Portfolio (marketing):** `lib/portfolio.ts` → `getPublishedPortfolio`, `getPortfolioByCategory`, etc. DB: `PortfolioProject`, `PortfolioImage`. Cover + gallery URLs.
- **Work (content):** `lib/content.ts` + `app/lib/work.ts`. Content/projects from MDX or workItems.
- **Client galleries:** `app/client/[gallerySlug]/page.tsx` — DB `Gallery`, `GalleryImage`, sortOrder, published.
- **GalleryLightbox.tsx** — yet-another-react-lightbox, next/image thumbs, Captions, Fullscreen, Zoom. Uses same URL for grid and lightbox (no thumb/full separation in schema).

## 4. Prisma Schema (relevant)

- `PortfolioProject`: category, categorySlug, coverUrl, published, images (PortfolioImage)
- `PortfolioImage`: url, storageKey, sortOrder, alt
- `Gallery`: published, images (GalleryImage)
- `GalleryImage`: url, storageKey, sortOrder, alt — **no thumbUrl/thumbKey**

## 5. Upload / Storage

- `lib/storage.ts`, `lib/storage-r2.ts` — R2/S3 via @aws-sdk
- API: `/api/admin/portfolio/upload-url`, `/api/admin/public-url`, `/api/admin/upload-url`

## 6. Category System

- **Existing:** `commercial-real-estate`, `hospitality`, `fashion`, `culinary` (workItems, services)
- **Services data:** portfolioHref = `/work/hospitality`, `/work/commercial-real-estate`, `/work/fashion`
- **Commercial-first:** Need to order Commercial first in work/portfolio lists. Mapping: `commercial-real-estate` → Commercial, `hospitality` → Hospitality, `fashion` → Fashion

## 7. File-Level Plan (Phased)

### Phase 1 — Style polish
- `app/globals.css` — typography utilities, section spacing, button/card refinements, reduce lift-card transform
- `tailwind.config.ts` — extend if needed for typography
- Pages: apply section py-16 lg:py-24, container max-w-6xl px-6 lg:px-10 where missing

### Phase 2 — Commercial-first
- `lib/portfolio.ts` — sort Commercial first when returning items
- `app/work/page.tsx` — order items Commercial first
- `app/portfolio/page.tsx` — same
- Services `portfolioHref` already correct

### Phase 3 — Gallery polish
- `components/GalleryLightbox.tsx` — aspect-ratio wrappers, ESC/arrows (already in lightbox), subtle fade
- `app/client/[gallerySlug]/page.tsx` — ensure next/image, sizes, aspect-ratio
- Schema has no thumb/full — use same URL; lightbox defers loading until open (lazy slides)

### Phase 4 — SEO
- Ensure unique metadata: Home, About, Contact, Services, Work, Portfolio, work detail pages
- Dynamic metadata for work/[segment]/[slug]
- Alt fallback: "[Category] photography by Bright Line Photography"
- OG route: already uses ImageResponse (no raw img)

### Phase 5 — Conversion
- `components/Navbar.tsx` — add "Start a Project" / "Request a quote" CTA (within existing nav, no new nav item)
- `components/Footer.tsx` — add CTA or "Start a Project" link
- `app/contact/page.tsx` — "We respond within 24 hours." above form, form spacing, focus states
- Service pages, work detail — already have PrimaryCTA; ensure bottom CTA with border-t

### Phase 6 — Performance
- `next.config.ts` — remotePatterns already has R2
- Verify no raw <img> (audit: none found)
- Ensure sizes on all next/image
- Remove unused imports if any
- Build + dev console check
