# Performance baseline

**Brightline Photography** (`brightlinephotography.com`)  
**Mirotech** (`mirotech.solutions`) — separate Vercel deploy  
**Captured:** 2026-08-29 (Phase 15A)  
**Policy:** Measure first; no speculative optimization in 15A.

**See also:** [deployment.md](../operations/deployment.md), [testing.md](../engineering/testing.md).

---

## Measurement methodology

| Tool | What it measures | Notes |
| --- | --- | --- |
| **Lighthouse 12** (CLI, mobile emulation, lab) | LCP, CLS, TBT (lab proxy for INP), FCP, performance score | Single run per URL; not RUM |
| **curl** (`time_starttransfer`) | TTFB for `HEAD` request | Includes network; can reflect cold starts |
| **Code review** | Rendering mode, query patterns, bundle imports | No fabricated timings |

Lighthouse **TTFB** and curl **TTFB** can disagree (HEAD vs GET, CDN cache, geographic path, cold serverless). Report both when collected.

---

## Baseline metrics (production, 2026-08-29)

### Brightline public

| Route | Perf score | LCP | FCP | TBT | Lighthouse TTFB | curl HEAD TTFB |
| --- | --- | --- | --- | --- | --- | --- |
| `/` (home) | **66** | **12.4 s** | 3.3 s | 60 ms | 290 ms | **2.85 s** |
| `/work` | **68** | **6.9 s** | 3.6 s | — | 20 ms | **1.61 s** |
| `/work/shared/mirotech-ops-intelligence-command-center` | **99** | **1.9 s** | — | — | 20 ms | 0.28 s |

**CLS:** 0 on measured Brightline lab runs.

**Homepage total transfer (Lighthouse):** ~1,908 KB.

**Homepage image samples (Lighthouse network):** multiple portfolio `web_full` assets ~265–565 KB each on first paint.

### Mirotech public

| Route | Perf score | LCP | FCP | Lighthouse TTFB | curl HEAD TTFB |
| --- | --- | --- | --- | --- | --- |
| `/` (home) | **84** | **4.4 s** | 1.7 s | 620 ms | **0.61 s** |

Mirotech is a **separate** Vercel project; metrics reflect that deploy only.

### Admin / Studio / platform

No authenticated Lighthouse runs in 15A (login required). Baseline is **architectural**:

- `/admin`, `/studio`, `/accountant` — `force-dynamic`, heavy client islands (R2 manager, image/video port, contracts).
- Platform services (`lib/platform/*`) run **in-process** in the Brightline serverless app — no separate latency tier.

---

## Architecture inventory

### Next.js rendering

| Pattern | Usage |
| --- | --- |
| **App Router** | Primary; RSC for most public pages |
| **`export const dynamic = "force-dynamic"`** | **Widespread** — root `layout.tsx`, homepage, work, services, blog, most admin/studio routes |
| **`react` `cache()`** | Blog, design, website pages, work pillars, feature flags, backgrounds — **request memoization only** (not ISR) |
| **`revalidatePath`** | Admin CMS mutations (blog, nav, work pillars, services) — no public `revalidate` export on pages |
| **ISR / `revalidate` seconds** | **Not used** on public marketing pages |

**Implication:** Public HTML is generated on **every request** (plus root layout DB reads), unless Vercel CDN caches at edge without documented `Cache-Control` on HTML.

### Server vs client components

- **Public marketing:** Mostly server pages; **client** islands include `HomeHero` (framer-motion), `Providers` (Lenis + SessionProvider + LazyMotion), `AppShell`, contact client, package client.
- **Admin / Studio:** Large **client** dashboards (`r2-manager-client`, `image-port-client`, `gallery-detail`, contracts builders, studio workspaces).

### Middleware / edge

- **`proxy.ts`** — CSP nonce, CSRF on operator API prefixes, admin cookie gate (not classic `middleware.ts` filename).
- Runs on matching routes; adds security headers, not a major CPU bottleneck relative to DB + media.

### Fonts

- `next/font/google`: Inter + Montserrat, `display: "swap"`, weights 400–600.

### Third-party scripts

- **Plausible** and/or **Google Analytics** via `components/Analytics.tsx` (`afterInteractive`).
- Lighthouse flagged ~71 KB unused GA script when GA env is set.

### Images

| Topic | Actual behavior |
| --- | --- |
| **`next/image`** | Used on work cards, heroes, galleries; **`images.unoptimized: true`** in `next.config.ts` |
| **Why unoptimized** | Assets are pre-exported WebP (`web_full` ~2400px, `web_thumb` ~800px); public URLs go through `/api/media/public` → short-lived signed R2 URL |
| **Public delivery** | `getPublicR2Url` / `getPublicR2FullBleedUrl` — prefers `web_full` for heroes |
| **Lazy loading** | `next/image` default lazy for below-fold; hero/home pillar cards load large URLs eagerly |
| **CDN** | R2 + Cloudflare; signed GET redirects |
| **Client delivery / finals** | Separate private keys + signed reads — **not** subject to public page budgets |

### Database (Neon)

- Prisma via server components and API routes.
- Root layout **every request:** `getSiteTheme`, `getSiteNav`, `getVisibleWorkPillarNavItems`, `getDesignSectionSettings`, `resolveSiteBackgroundMedia` (with 1.5s timeouts + fallbacks).

### Caching headers

- Long cache on favicons/manifest (`next.config.ts` headers).
- `/api/media/public` — redirect to signed URL; rate-limited.
- HTML pages — no explicit long-lived `Cache-Control` in config reviewed.

---

## Major issues (priority ranked)

### P0 — Homepage LCP (~12.4 s lab)

**Evidence:** Lighthouse LCP 12.4 s on `/`; work index 6.9 s; individual project page 1.9 s.

**Likely drivers (code + network):**

1. Multiple **large `web_full`** images on homepage pillar grid (~500 KB+ each in lab trace).
2. **HomeHero** client component may load hero **video** + featured image (framer-motion + Lenis already on main thread).
3. **Serial/parallel server work** before HTML: dual-brand `fetchDualBrandWork()` (`cache: "no-store"`, up to 8s timeout) when dual-brand hub pillar visible; per-pillar `getFeaturedHeroForSection` queries (N queries for N pillars).

**Not recommended in 15A:** Reducing final delivery or client-gallery resolution.

### P1 — Global `force-dynamic` + layout DB fan-out

**Evidence:** `app/layout.tsx` and most public pages export `force-dynamic`; layout runs 4–5 DB-backed calls per navigation.

**Impact:** Elevated TTFB on cold serverless (curl home **2.85 s**); prevents static/ISR wins on marketing pages.

### P2 — Work index LCP (~6.9 s)

Similar pillar cover logic as homepage; `Promise.all` over pillars with per-pillar hero queries; dual-brand fetch when hub pillar present.

### P3 — Cross-brand HTTP on critical path

`fetchDualBrandWork` / `fetchMirotechSiteWork` use `fetch(..., { cache: "no-store" })` to Mirotech content API — adds network dependency on Brightline homepage/work when dual-brand content is shown.

### P4 — Public JS weight

Lighthouse ~1.9 MB total page weight on home; unused-JS audit flags main app chunks (~24 KB each) + analytics. **Lenis** + **framer-motion** (LazyMotion) on all non-operator public routes.

### P5 — Admin/Studio client surface (unmeasured)

Heavy client modules: R2 manager, image-port, video-port, contracts (`isomorphic-dompurify` / jsdom chain in server bundles for document routes). Operator UX priority over public Core Web Vitals — still affects editor responsiveness.

### P6 — Mirotech homepage LCP (~4.4 s)

Better than Brightline home but above “good” threshold; separate optimization track on Mirotech deploy.

---

## Database / query findings (major only)

| Finding | Location | Severity |
| --- | --- | --- |
| **Per-pillar hero query on home/work** | `getFeaturedHeroForSection` inside `visiblePillars.map` | Medium — N round-trips; `getPublishedProjectsBySections` exists but not used for home pillar covers |
| **Case study payload** | `WORK_CASE_STUDY_INCLUDE` loads all project media + hero | Medium for huge galleries — acceptable for detail pages |
| **R2 key usage scan** | `admin-r2-manager.ts` — 15+ parallel `findMany` per key lookup | Admin-only; expensive but intentional for delete safety |
| **Gallery access token lookup** | `client-access.ts` `findMany` on hint | Bounded by hint index (`@@index([isActive, codeHint])`) |
| **Unbounded public lists** | Most public queries use `published: true` with ordering; gallery cards limited (`take: 3` on home) | Low for public; admin APIs use `take: 50–200` |

No evidence of missing indexes on hot **public** paths reviewed; schema has indexes on `section`, `published`, gallery tokens, etc.

---

## Media performance notes

| Surface | Strategy | 15A concern |
| --- | --- | --- |
| Public portfolio cards | `web_full` via `getPublicR2FullBleedUrl` | Large LCP element weight on listing/home |
| Work cards | `next/image`, `sizes` 50vw/100vw, quality 85 | Good pattern; source files still large |
| Hero / background | Full-bleed URLs, optional video env keys | Hero is LCP candidate |
| Client galleries | Private keys, signed reads | Correct separation from public budgets |
| Package / delivery | Token-gated APIs | Not measured in CWV pass |

---

## Performance budgets (targets for Phase 15B)

Reasonable for a photography marketing site on Vercel Hobby — **not** enterprise SLAs.

| Category | Budget | Current (home lab) |
| --- | --- | --- |
| **LCP (public marketing)** | ≤ 2.5 s good / ≤ 4 s acceptable | **12.4 s** (home) — fail |
| **CLS** | ≤ 0.1 | **0** — pass |
| **INP (field)** | ≤ 200 ms | Not collected; TBT 60 ms (lab) |
| **TTFB (marketing HTML)** | ≤ 600 ms warm / ≤ 1.2 s cold | Variable; curl home 2.85 s cold |
| **Public initial JS (transfer)** | ≤ 350 KB gzip (marketing) | Part of ~1.9 MB total page weight |
| **Hero image (public LCP candidate)** | ≤ 200 KB WebP where possible for **listing** cards; full `web_full` on detail | ~500 KB+ per home pillar image observed |
| **API list responses (admin)** | ≤ 500 ms p95 for paginated lists | Not measured — enforce existing `take` limits |
| **Dual-brand content fetch** | ≤ 300 ms cached / fail-soft | Uncached `no-store`, 8s timeout |

**Explicit exclusion:** Client delivery downloads and final-package files — quality and resolution trump lab scores.

---

## Recommended Phase 15B priority list

1. **Homepage LCP** — Use `web_thumb` (or dedicated home-card size) for pillar grid; keep `web_full` on detail; preload only true LCP hero (image or poster); defer non-critical pillar images.
2. **Public page caching** — Pilot ISR or `revalidate` on `/`, `/work`, static marketing pages; keep admin `force-dynamic`.
3. **Root layout data** — Cache nav/theme/pillar nav with `unstable_cache` + tag revalidation (align with existing `revalidatePath` on admin saves).
4. **Batch pillar hero queries** — Single query for featured heroes per section set on home/work.
5. **Dual-brand fetch** — Short TTL cache (`fetch` `next: { revalidate: 60 }` or `cache()`) for `fetchDualBrandWork` on public pages; retain `no-store` for admin publish paths.
6. **Public JS** — Audit Lenis + framer-motion on first paint; defer motion below hero if needed.
7. **Mirotech home LCP** — Mirror Brightline image tier strategy on Mirotech deploy.
8. **Admin bundle** — Optional `@next/bundle-analyzer` on successful CI build; code-split R2 manager / image-port routes.
9. **RUM** — Enable field CWV (Vercel Speed Insights or GA4 Web Vitals) before/after 15B changes.

---

## What we did not do in 15A

- No broad refactors, ISR rollout, or image pipeline changes.
- No production load tests or Neon query plan analysis.
- Local `npm run build` failed (webpack ESM externals in `isomorphic-dompurify` chain) — bundle sizes from Lighthouse network audit only.

---

## Commands to reproduce

```bash
# Lab CWV (requires Chrome)
npx lighthouse https://brightlinephotography.com/ --only-categories=performance

# TTFB spot check
curl -sI -o /dev/null -w 'TTFB: %{time_starttransfer}s\n' https://brightlinephotography.com/

# Unit tests (unchanged)
npm test
```

---

## Phase 15B optimizations (2026-08-29)

Shipped on `architecture/platform-foundation` (deploy required for production effect):

1. **Listing image tier** — `web_thumb` for home/work pillar and grid cards; LCP preload for hero poster/featured image.
2. **60s ISR + `unstable_cache`** for layout chrome; batched pillar hero query; cached dual-brand work list on public pages.
3. **Deferred Lenis** + Vercel Speed Insights for field CWV.

See [PHASE-15B-performance-optimization-report.md](../architecture/PHASE-15B-performance-optimization-report.md).
