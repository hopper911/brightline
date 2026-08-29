# PHASE 15C — Post-deploy performance follow-up

**Date:** 2026-08-29  
**Branch:** `architecture/platform-foundation`

---

## Post-deploy Lighthouse (production lab, same methodology as 15A)

Captured after **15B deploy** to `brightlinephotography.com` (partial — HTML still shows `cache-control: private, no-cache` on home; ISR may need full promotion or Vercel config review).

| Route | 15A score | 15A LCP | Post-15B score | Post-15B LCP | Δ LCP |
| --- | --- | --- | --- | --- | --- |
| Brightline `/` | 66 | **12.4 s** | **74** | **9.1 s** | **−3.3 s** |
| Brightline `/work` | 68 | **6.9 s** | **74** | **5.6 s** | **−1.3 s** |
| Brightline project detail | 99 | 1.9 s | (unchanged tier) | ~1.9 s | — |
| Mirotech `/` | 84 | 4.4 s | (re-run flaky) | — | — |

**Method:** Lighthouse CLI mobile lab, 2026-08-29. Re-run anytime: `npm run perf:lighthouse`.

**FCP home:** 3.3 s → **1.6 s** (post-15B).

---

## Phase 15C code changes (this commit)

### 1. Hero video LCP

`HomeHero.tsx`: poster image is **priority LCP**; video `preload="none"`, `src` deferred via `requestIdleCallback` (2.5s cap). Video fades in after `onPlaying`.

### 2. Public route ISR (23 pages)

Replaced `force-dynamic` with `revalidate = 60` on blog, travel, services, about, galleries, design, work sections, SEO landers, catch-all marketing routes. **Token/client routes stay dynamic** (`/client`, `/package`, `/delivery`, `/final-package`).

### 3. Admin R2 bundle

`dynamic()` import for `r2-manager-client` — splits heavy admin media UI from initial admin shell chunk. Image-port/video-port routes redirect to R2 (no separate bundle).

### 4. Mirotech home (4.4 s LCP)

**Out of this repo.** `mirotech.solutions` is a separate Vercel project; content API is fetched from Mirotech origin. Brightline already caches `fetchDualBrandWork` 60s for cross-brand cards. Mirotech site optimization requires changes on the **Mirotech deploy** (listing image tier, ISR) — mirror 15B patterns there.

### 5. Measurement tooling

- `scripts/perf-lighthouse-snapshot.mjs`
- `npm run perf:lighthouse`
- Vercel Speed Insights (from 15B) for field CWV after deploy

---

## Remaining

| Item | Status |
| --- | --- |
| Home LCP &lt; 2.5 s | Still **9.1 s** lab — hero video fix + 15C deploy needed |
| HTML `Cache-Control` | Still `private, no-cache` on home — verify ISR at edge after 15C |
| Mirotech home | Separate repo / deploy |
| Admin non-R2 heavy pages | Studio calendar/tasks — future code-split |
| Field CWV | Speed Insights dashboard after traffic |

---

## Regression

- `npm test` — run before merge
- Client delivery / full-res assets unchanged
