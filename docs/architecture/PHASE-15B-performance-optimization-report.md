# PHASE 15B — Performance Optimization Report

**Date:** 2026-08-29  
**Branch:** `architecture/platform-foundation`  
**Policy:** Top 3 high-impact areas from Phase 15A — no speculative optimization.

---

## 1. Optimizations selected (max 3 areas)

| # | Area | 15A evidence |
| --- | --- | --- |
| **A** | **Public listing image tier + LCP preload** | Home LCP **12.4 s** lab; multiple **500 KB+** `web_full` pillar images; work index LCP **6.9 s** |
| **B** | **Server cache + query batching** | Global `force-dynamic`; layout DB fan-out; N × `getFeaturedHeroForSection`; uncached dual-brand HTTP |
| **C** | **Defer first-paint client JS + field CWV** | Lenis on all public routes; TBT acceptable but main-thread work at load; no field INP/LCP RUM |

**Deferred (not in top 3):** Admin bundle code-splitting, Mirotech site deploy changes (separate Vercel project), bundle analyzer script.

---

## 2. Why they mattered

- **A** — Largest measured regression was **image weight on listing surfaces**, not case-study detail pages (detail scored **99 / 1.9 s LCP**). Cards do not need `web_full`; client delivery unchanged.
- **B** — Every public page paid **full SSR + layout DB** on each request; homepage also ran **serial per-pillar hero queries** and **no-store** Mirotech fetch.
- **C** — Lenis initializes on every public navigation; deferring reduces main-thread contention during LCP window. Speed Insights enables **post-deploy** field validation.

---

## 3. Changes

### Area A — Images

- `preferPortfolioWebThumbKey`, `getPublicR2CardUrl` — card tier (~800px `web_thumb`)
- `buildVisiblePillarCovers()` — pillar grids use card URLs; `coverBleedUrl` retained for page backgrounds
- `dualBrandMediaCardSrc` — dual-brand listing cards use thumb tier
- Home: `<link rel="preload">` for hero poster or featured image (single LCP candidate)
- Work/home featured studio + collaboration grids use card URLs; lazy loading on below-fold grids

### Area B — Cache + queries

- `getPublicChromeBundle()` — `unstable_cache` 60s for nav, theme, pillar nav, design, background
- `revalidatePublicChrome()` on admin site-nav, theme, work-pillars, website-pages, design-section saves
- `getFeaturedHeroMapForSections()` — one Prisma query for all pillar heroes
- `getCachedDualBrandWorkForPublic()` — 60s cache for dual-brand work list on public pages
- `export const revalidate = 60` on root layout, `/`, `/work` (replaces `force-dynamic` on those surfaces)

### Area C — Client + RUM

- Lenis deferred via `requestIdleCallback` (2s timeout) or 1.2s `setTimeout`
- `@vercel/speed-insights` in root layout

### Tests

- `lib/portfolio-web-full.test.ts` — thumb/full key helpers

---

## 4. Before metrics (Phase 15A, production lab)

| Route | Score | LCP | curl TTFB |
| --- | --- | --- | --- |
| Brightline `/` | 66 | **12.4 s** | **2.85 s** |
| Brightline `/work` | 68 | **6.9 s** | **1.61 s** |
| Brightline project detail | 99 | 1.9 s | 0.28 s |
| Mirotech `/` | 84 | 4.4 s | 0.61 s |

Method: Lighthouse CLI mobile lab + curl HEAD, 2026-08-29.

---

## 5. After metrics

**Not measured on production yet** — changes require deploy to `brightlinephotography.com`.

Post-deploy verification (same commands as 15A):

```bash
npx lighthouse https://brightlinephotography.com/ --only-categories=performance
curl -sI -o /dev/null -w 'TTFB: %{time_starttransfer}s\n' https://brightlinephotography.com/
```

**Expected direction (code-level, not claimed as measured):**

| Signal | Expected change |
| --- | --- |
| Home/work LCP | Lower — smaller card images + preload |
| Home/work TTFB (warm) | Lower — ISR 60s + chrome cache |
| Project detail | Unchanged — still full bleed where appropriate |
| Field CWV | Speed Insights after deploy |

---

## 6. Regression checks

| Check | Result |
| --- | --- |
| `npm test` | **528 passed** |
| Client delivery / private keys | **Unchanged** — card tier only on public listing URLs |
| Case study / hero backgrounds | **Still `web_full`** via `coverBleedUrl` / `getPublicR2FullBleedUrl` |
| Admin CMS saves | `revalidatePublicChrome()` + existing `revalidatePath` |
| Operator Lenis lock | **Unchanged** — Lenis still disabled on `/admin`, `/studio`, `/accountant` |

---

## 7. Remaining major bottlenecks

| Item | Notes |
| --- | --- |
| **Post-deploy Lighthouse** | Required to confirm LCP/TTFB improvement |
| **Home hero video** | If `NEXT_PUBLIC_HERO_VIDEO_KEY` set, video may still dominate LCP — poster preload helps |
| **Mirotech home (4.4 s LCP)** | Separate deploy; content API cache helps Brightline only |
| **Admin bundle size** | R2 manager / image-port — Phase 15C candidate |
| **Many routes still `force-dynamic`** | Blog, services, galleries — extend ISR selectively |
| **Local `npm run build`** | Still fails on dompurify ESM chain — pre-existing |

---

## Files created/modified

| File | Change |
| --- | --- |
| `lib/portfolio-web-full.ts` | `preferPortfolioWebThumbKey` |
| `lib/r2.ts` | `getPublicR2CardUrl` |
| `lib/pillar-cover-data.ts` | **Created** — batched pillar covers |
| `lib/public-chrome-cache.ts` | **Created** — layout chrome cache |
| `lib/revalidate-public-chrome.ts` | **Created** |
| `lib/queries/work.ts` | `getFeaturedHeroMapForSections` |
| `lib/dual-brand/content-api.ts` | Public cache + `dualBrandMediaCardSrc` |
| `app/page.tsx`, `app/work/page.tsx` | Card URLs, revalidate, preload |
| `app/layout.tsx` | Chrome cache, Speed Insights, revalidate |
| `app/providers.tsx` | Deferred Lenis |
| Admin CMS routes | `revalidatePublicChrome()` |
| `lib/portfolio-web-full.test.ts` | **Created** |

---

## Runtime production behavior

**Changed after deploy:** Public home/work use thumb-tier listing images, 60s ISR/cache for chrome and dual-brand list, deferred Lenis, Speed Insights RUM. **No change** to client delivery download quality or final asset resolution.

---

## Summary

Phase 15B targets the three **15A-identified** bottlenecks: oversized listing imagery, uncached SSR/DB fan-out, and early Lenis load. Re-measure on production after deploy to validate LCP and TTFB gains.
