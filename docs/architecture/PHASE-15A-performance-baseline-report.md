# PHASE 15A — Performance Baseline Report

**Date:** 2026-08-29  
**Branch:** `architecture/platform-foundation`  
**Policy:** Measure first; no speculative optimization.

---

## 1. Public site findings

### Brightline

| Route | Perf | LCP | FCP | TBT | Lighthouse TTFB | curl TTFB |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | 66 | **12.4 s** | 3.3 s | 60 ms | 290 ms | **2.85 s** |
| `/work` | 68 | **6.9 s** | 3.6 s | — | 20 ms | **1.61 s** |
| Project detail (sample) | 99 | **1.9 s** | — | — | 20 ms | 0.28 s |

- **CLS:** 0 (lab).
- **Total page weight (home):** ~1,908 KB (Lighthouse).
- **Primary regression:** Homepage and work **index** — not project detail pages.

### Mirotech (separate deploy)

| Route | Perf | LCP | FCP | Lighthouse TTFB | curl TTFB |
| --- | --- | --- | --- | --- | --- |
| `/` | 84 | **4.4 s** | 1.7 s | 620 ms | **0.61 s** |

---

## 2. Admin/Studio findings

- No lab scores (auth required).
- **Architectural:** `force-dynamic` on operator routes; large client bundles (R2 manager, image/video port, contracts).
- **Lenis disabled** on `/admin`, `/studio`, `/accountant` (by design — sidebar scroll lock).
- Platform ops (`/studio/ops`) same deploy — server-heavy list queries with pagination in API layer.

---

## 3. Media performance

- **`images.unoptimized: true`** — intentional; WebP pipeline + `/api/media/public` signed redirects.
- Homepage loads multiple **`web_full`** assets (~265–565 KB each in lab) for pillar cards — drives LCP.
- **`web_thumb`** (~800px) available but full-bleed helper used for listing covers.
- Client delivery / finals use **private** keys — correctly outside public optimization scope.
- Hero video optional via `NEXT_PUBLIC_HERO_VIDEO_KEY` — potential LCP competitor on home.

---

## 4. Database/query findings

| Issue | Severity |
| --- | --- |
| Root layout: 4–5 DB calls every request | **High** (TTFB) |
| Homepage/work: N × `getFeaturedHeroForSection` per pillar | **Medium** |
| `fetchDualBrandWork` HTTP `no-store` on critical path | **Medium** |
| `WORK_CASE_STUDY_INCLUDE` full media on detail | **Low–medium** (large galleries) |
| Admin R2 usage scan: 15+ parallel `findMany` | Admin-only; acceptable |

No critical missing-index evidence on reviewed public paths.

---

## 5. Bundle findings

- Lighthouse unused-JS: main app chunks ~24 KB each; analytics ~71 KB when GA enabled.
- Public providers: **next-auth** SessionProvider, **Lenis**, **framer-motion** LazyMotion on all public routes.
- **HomeHero** is a client component with motion + optional video.
- Local production build failed (dompurify/jsdom ESM chain) — no webpack bundle analyzer output; use Lighthouse transfer sizes.
- Admin: `react-easy-crop`, large R2 client — not on public critical path.

---

## 6. Major bottlenecks

1. **Homepage LCP** — large images + heavy server work + client motion stack.
2. **Global dynamic rendering** — no ISR; every HTML request hits server + layout DB.
3. **Work index LCP** — same pillar cover pattern as home.
4. **Dual-brand HTTP** — uncached Mirotech content API on Brightline home/work.
5. **Public JS/CSS weight** — Lenis, framer-motion, analytics (~1.9 MB total home transfer).

---

## 7. Baseline metrics available

| Metric | Collected? |
| --- | --- |
| LCP / FCP / CLS / TBT (lab) | Yes — Lighthouse CLI, 2026-08-29 |
| TTFB | Yes — Lighthouse + curl (vary) |
| INP (field) | **No** — recommend RUM in 15B |
| Admin load times | **No** |
| Neon query latency | **No** |
| Bundle analyzer | **No** (build failed locally) |
| API p95 latencies | **No** |

---

## 8. Recommended Phase 15B priority list

1. Homepage/work listing image tier (`web_thumb` for cards; preload single LCP hero).
2. ISR or tagged cache for public marketing pages + root layout nav/theme.
3. Batch pillar hero Prisma queries on home/work.
4. Cache dual-brand content API reads on public pages (short TTL).
5. Defer or scope Lenis/framer-motion on initial paint.
6. Mirotech home LCP alignment.
7. Bundle analyzer in CI + admin route code-splitting.
8. Field CWV monitoring (Vercel Speed Insights or GA4).

---

## Files created

| File | Purpose |
| --- | --- |
| `docs/performance/baseline.md` | Baseline metrics, budgets, inventory |
| `docs/architecture/PHASE-15A-performance-baseline-report.md` | This report |

---

## Runtime production behavior changed

**No.** Documentation and measurement only.

---

## Summary

Phase 15A establishes that **Brightline homepage LCP (~12.4 s lab)** and **work index (~6.9 s)** are the primary public regressions, while **project detail pages score well (~99 / 1.9 s LCP)**. Root causes align with **`force-dynamic`**, layout DB fan-out, **large `web_full` images on listing surfaces**, and **uncached dual-brand fetches** — not client delivery quality. Mirotech home is moderate (**4.4 s LCP**). No optimization work shipped in 15A.
