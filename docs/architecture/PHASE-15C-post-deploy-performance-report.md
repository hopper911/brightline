# PHASE 15C — Post-deploy performance follow-up

**Date:** 2026-08-29  
**Branch:** `architecture/platform-foundation`  
**Production deploy:** `brightline-5pers1qqo` → `brightlinephotography.com`

---

## Post-deploy Lighthouse (production lab)

Methodology matches Phase 15A: Lighthouse CLI mobile lab. Re-run: `npm run perf:lighthouse`.

| Route | 15A score | 15A LCP | Post-15B LCP | Post-15C score | Post-15C LCP | Δ vs 15A |
| --- | --- | --- | --- | --- | --- | --- |
| Brightline `/` | 66 | **12.4 s** | 9.1 s | **76** | **6.2 s** | **−6.2 s** |
| Brightline `/work` | 68 | **6.9 s** | 5.6 s | **98** | **2.2 s** | **−4.7 s** |
| Brightline project detail | 99 | 1.9 s | ~1.9 s | **94** | 3.0 s | +1.1 s |
| Mirotech `/` | 84 | **4.4 s** | (flaky) | **83** | **4.4 s** | — |

**FCP home:** 3.3 s (15A) → 1.6 s (15B) → **1.7 s** (15C).  
**TTFB (Lighthouse):** home **20 ms**, work **10 ms** (15A curl TTFB was 2.85 s / 1.61 s).

Raw snapshot: `docs/performance/snapshots/2026-08-29-post-15c.json`.

---

## Phase 15C shipped

### 1. Hero video LCP

`HomeHero.tsx`: poster image is priority LCP; video `preload="none"`, `src` deferred via `requestIdleCallback` (2.5 s cap). Video fades in after `onPlaying`.

### 2. Public route ISR (28 pages + layout)

Replaced `force-dynamic` with `revalidate = 60` on blog, travel, services, about, galleries, design, work sections, SEO landers, catch-all marketing routes. **Token/client routes stay dynamic** (`/client`, `/package`, `/delivery`, `/final-package`).

Note: Next.js static config requires a **literal** `revalidate` number on pages (not imported constants).

### 3. Admin R2 bundle

`nextDynamic()` import for `r2-manager-client` (avoids clash with `export const dynamic`). Image-port/video-port routes redirect to R2 only.

### 4. Mirotech home (4.4 s LCP)

**Out of this repo.** `mirotech.solutions` is a separate Vercel project; Lighthouse TTFB **1.8 s** vs Brightline **20 ms**. Mirror 15B listing-tier + ISR patterns on the Mirotech deploy.

### 5. Measurement tooling

- `scripts/perf-lighthouse-snapshot.mjs`
- `npm run perf:lighthouse`
- Vercel Speed Insights (15B) for field CWV

---

## Cache-Control vs TTFB

Production HTML still returns `cache-control: private, no-cache` on `/`, `/work`, `/blog` (root layout calls `headers()` for CSP nonce). **ISR + `unstable_cache` still cut server work** — Lighthouse TTFB dropped to ~10–20 ms even though edge HTML is not publicly cacheable.

Future option: move nonce to middleware-only response headers without forcing full dynamic layout, if we want `s-maxage` on HTML.

---

## Remaining

| Item | Status |
| --- | --- |
| Home LCP &lt; 2.5 s | **6.2 s** lab — major improvement; still image-heavy hero grid |
| HTML public CDN cache | Blocked by layout `headers()` + nonce |
| Mirotech home | Separate repo / deploy (4.4 s LCP unchanged) |
| Admin non-R2 heavy pages | Studio calendar/tasks — future code-split |
| Field CWV | Speed Insights dashboard after traffic |

---

## Deploy fixes (same release)

- Literal `revalidate = 60` (SWC/Next config analysis)
- Batch-import syntax repair on blog/travel/galleries/design/work
- `pillar-cover-data.ts` nullish coalescing parens
- R2 page `nextDynamic` vs `export const dynamic` name clash

---

## Regression

- `npm test` — 528 passed before production deploy
- Client delivery / full-res assets unchanged
