# DEPENDENCY HYGIENE REPORT — PHASE 19

**Project:** Brightline Photography ↔ MiroTech Solutions  
**Date:** 2026-08-29  
**Scope:** Brightline app (`brightline/`) + Mirotech site (`mirotech-solutions`); tools workspace noted

---

## 1. Unused dependencies removed

### Brightline (`package.json`)

| Package | Reason |
| --- | --- |
| `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` | Zero imports in repo |
| `@fontsource/inter`, `@fontsource/montserrat` | Zero imports (fonts via `next/font` / CSS) |
| `@aws-crypto/crc32c` | Zero imports |
| `@ffmpeg/core` | FFmpeg core loaded from CDN in `lib/ffmpeg-load.ts`, not npm import |
| `gray-matter` | Zero imports |
| `web-vitals` | Zero imports (eslint uses `eslint-config-next/core-web-vitals`, different package) |
| `tslib` | Zero direct imports |

### Mirotech (`package.json`)

| Package | Reason |
| --- | --- |
| `next-auth` | Zero imports; admin uses HMAC cookie (`lib/admin-session.ts`), not NextAuth |

**Not removed (verified in use):** `@ffmpeg/ffmpeg`, `@ffmpeg/util`, `lenis`, `leaflet`, `next-auth` (Brightline legacy `/api/auth`), `imapflow`/`mailparser`, `archiver`, `pdfkit`, dual R2 clients (`@aws-sdk/*` + `aws4fetch`).

---

## 2. Duplicates consolidated

| Area | State | Action |
| --- | --- | --- |
| **Validation** | Single library: **Zod** (`zod`) | No `yup`/`joi` — no change |
| **Auth** | Multiple surfaces by design: admin HMAC cookie, accountant JWT (`jose`), Brightline `next-auth` stub, client gallery session | Added missing **`jose`** dependency (was transitive-only) |
| **AWS / R2** | `@aws-sdk/client-s3` + presigner (multipart, admin ops) + `aws4fetch` (public sign proxy) | **Intentional dual stack** — not consolidated |
| **googleapis** | Brightline `scripts/sheet-publish.mjs` + `tools/` workspace | Moved Brightline copy to **devDependencies** (operator script, not production bundle) |
| **@types/archiver**, **@types/pdfkit** | Were in `dependencies` | Moved to **devDependencies** |
| **Mirotech vs Brightline** | Separate `package.json` per deploy | Expected; shared patterns (Prisma, R2, Zod) not a monorepo package |

---

## 3. Module-boundary issues fixed

| Issue | Fix |
| --- | --- |
| Missing direct dependency `jose` used by `lib/accountant/jwt.ts` | Added `jose` to Brightline `dependencies` |
| `@types/*` in production `dependencies` | Moved to `devDependencies` |
| `googleapis` in production `dependencies` | Moved to `devDependencies` (CLI script only) |

**Platform imports:** `lib/platform/*` services use `import "server-only"` on write paths; Studio UI imports **types** only (e.g. `PlatformAssetRecord`) — no circular app→app leaks found in review.

**No broad refactors** of Prisma-in-RSC patterns in this phase (server components importing `prisma` / `@prisma/client` types remain valid).

---

## 4. Server/client issues

| Check | Result |
| --- | --- |
| `lib/storage-r2.ts`, `lib/prisma.ts` | API routes and server libs only — **not** imported from `"use client"` components |
| `lib/r2.ts`, `lib/r2-vaults-shared.ts` | **Client-safe** URL builders / vault ids — no env secrets |
| `lib/r2-vaults.ts` | Server credentials — imported from API routes and server libs only |
| `openai`, `stripe` | API routes and `lib/ai/*` only |
| `@prisma/client` in client components | **Type-only** imports in some admin client components — acceptable; no `prisma` client in `"use client"` files |
| `next.config.ts` | `serverExternalPackages` includes heavy native deps (pattern from existing config) |

**Residual:** `lib/storage-r2.ts` does not import `server-only` — relies on import graph. Consider `import "server-only"` in a follow-up if a client file ever imports it.

---

## 5. High-risk outdated dependencies

| Item | Risk | Recommendation |
| --- | --- | --- |
| **`jose` missing from package.json** | Runtime/lockfile drift | **Fixed** — added explicit dependency |
| **`vercel` CLI (devDep)** | `npm audit`: many **high** findings in `@vercel/*` transitive tree | Defer — dev-only CLI; do not `audit fix --force` during hygiene |
| **Root workspace `next@16.1.5`** vs app `16.2.12` | Minor version skew in monorepo root | Defer — align root devDep when convenient |
| **Mirotech `sharp@0.33.5`** vs Brightline `0.34.5` | Patch drift | Defer — upgrade Mirotech sharp in dedicated pass |
| **Mirotech `vitest@2`** vs Brightline `vitest@3` | Test runner only | Defer |

No **critical** production-runtime CVE requiring immediate framework migration identified in this pass.

---

## 6. Deferred upgrades

- Next.js / React major bumps (already on Next 16 + React 19)
- Consolidating `@aws-sdk/*` and `aws4fetch` into one client
- Removing Brightline `next-auth` (still wired in `app/providers.tsx` + `/api/auth/[...nextauth]`)
- `vercel` CLI major / audit-driven mass bump
- `madge` circular-dependency CI gate
- `server-only` on `lib/storage-r2.ts` and `lib/prisma.ts`
- Root `package.json` `next` version alignment

---

## 7. Validation

| Check | Result |
| --- | --- |
| `npm install` (Brightline) | OK |
| `npm test` | **532 tests passed** (133 files) |
| `npm run build` | **Passed** — replaced `isomorphic-dompurify` (jsdom/webpack ESM chain) with browser-only `dompurify` in `lib/contracts/sanitize-html.ts` |
| Mirotech `next-auth` removal | **Passed** — `npm install`, 42 tests, `npm run build` |

---

## Package inventory summary

| Category | Brightline | Mirotech |
| --- | --- | --- |
| Validation | Zod only | Zod only |
| Auth | Admin cookie, accountant JWT, next-auth stub, client session | Admin cookie only |
| R2 | AWS SDK v3 + aws4fetch | AWS SDK v3 + aws4fetch |
| ORM | Prisma 5.22 | Prisma 5.22 |
| Legacy / deprecated | `next-auth` v4 (partial use), `lib/storage.ts` shim | — |

**Tools workspace (`tools/package.json`):** Own `@aws-sdk/client-s3`, `googleapis`, `sharp` — appropriate for standalone operator scripts.

---

## Files changed

- `brightline/package.json` — remove 10 unused deps; add `jose`; move types + googleapis to devDeps; swap `isomorphic-dompurify` → `dompurify` + `jsdom` (dev)
- `lib/contracts/sanitize-html.ts` — browser-only HTML sanitization (fixes webpack build)
- `mirotech-solutions/package.json` — remove unused `next-auth`
