# Media / R2 Current State (Phase 3A Inventory)

**Document date:** 2026-08-28  
**Scope:** Brightline Photography Next.js app (`brightline/`) — shared R2 operations for Brightline + Mirotech CMS media  
**Rule:** This document is observational. No object keys, buckets, or delivery URLs were changed to produce it.

---

## 1. R2 architecture overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Application routes & lib/storage*.ts                                   │
├──────────────────────────────┬──────────────────────────────────────────┤
│  Brightline vault            │  Mirotech-site vault                      │
│  (R2_BUCKET)                 │  (MIROTECH_R2_BUCKET)                     │
│  lib/r2-vaults.ts            │  Same credential helper on Brightline     │
├──────────────────────────────┴──────────────────────────────────────────┤
│  lib/storage-r2.ts — S3Client, signPut/signGet, list/copy/delete/multipart│
│  lib/storage-r2-public.ts — Brightline presigned GET for /api/media/public│
│  lib/r2.ts — DB key → /api/media/public?key= (public prefixes)          │
└─────────────────────────────────────────────────────────────────────────┘
         │                                    │
         ▼                                    ▼
   Cloudflare R2 (brightline bucket)    Cloudflare R2 (mirotech bucket)
         │                                    │
         ▼                                    ▼
   /api/media/public (public keys)      media.mirotech.solutions CDN (Mirotech deploy)
   Presigned redirects / proxy           Admin: /api/admin/r2/sign?vault=mirotech-site
```

**Stack:** `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, optional `aws4fetch` in edge paths.

**Dual-vault hub:** Admin R2 manager operates both vaults from Brightline deploy (`lib/r2-vaults.ts`, `lib/r2-vaults-shared.ts`).

---

## 2. Buckets

| Vault ID | Env bucket var | Used by | Public delivery |
| --- | --- | --- | --- |
| `brightline` | `R2_BUCKET` | Brightline site, Studio OS, galleries, portfolio, client delivery, accounting | `/api/media/public?key=` for allowlisted prefixes; presigned GET otherwise |
| `mirotech-site` | `MIROTECH_R2_BUCKET` (must start with `mirotech`) | Mirotech CMS content managed from Brightline admin | `NEXT_PUBLIC_MIROTECH_R2_PUBLIC_URL` / `media.mirotech.solutions`; admin signed GET |

**No bucket column in Prisma** — bucket implied by vault credentials + object key prefix conventions.

**Environment-specific:** Same env var names in dev/preview/production; bucket names differ per Vercel environment (not hard-coded in repo).

**Credentials (names only):**

- Brightline: `R2_ENDPOINT`, `R2_REGION`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`, `NEXT_PUBLIC_R2_PUBLIC_URL`
- Mirotech vault: `MIROTECH_R2_*`, `NEXT_PUBLIC_MIROTECH_R2_PUBLIC_URL`

---

## 3. Object namespaces (actual prefixes)

### Brightline vault — public marketing (`PUBLIC_MEDIA_PREFIXES`)

```
portfolio/          mirotech/           portfolio-public/
work/               studio/             site/
acd/  rea/  cul/  biz/  tri/  thumb/   (legacy Lightroom sections)
```

### Brightline vault — private (`PRIVATE_MEDIA_PREFIXES`)

```
client-galleries/   delivery/   accounting/
```

### Brightline vault — admin-signable extras

```
journal/   tmp/   studio-os/   (studio-os/receipts/ subset)
```

### Brightline vault — manager roots (`R2_MANAGER_ROOTS`)

```
portfolio/arc/  portfolio/cam/  portfolio/cor/  portfolio/
mirotech/
client-galleries/  work/  studio/
site/  site/backgrounds/{full|web|posters}/
delivery/  journal/  accounting/  tmp/
```

### Mirotech-site vault (`MIROTECH_SITE_ALLOWED_PREFIXES`)

```
projects/   journal/   resume/   site/
site/backgrounds/{full|web|posters}/
```

### T9 encode tree (Brightline bucket)

```
{portfolio|mirotech}/{segment}/web_full/{stem}.webp
{portfolio|mirotech}/{segment}/web_thumb/{stem}.webp
{portfolio|mirotech}/{segment}/web_video/{stem}.mp4
mirotech/portfolio/{arc|cam|cor}/web_video/...   (reorg path)
```

**Segments:** Brightline pillars `arc/cam/cor`; Mirotech categories `product/editorial/brand/service/research/motion` (+ legacy pillars).

### Multipart staging

```
brightline:     tmp/r2-upload/{stagingId}/
mirotech-site:  site/.upload-parts/{stagingId}/
tmp/image-port/  tmp/video-port/
```

### Key composition patterns

| Pattern element | Examples |
| --- | --- |
| Tenant/category segment | `portfolio/arc/`, `mirotech/product/`, `projects/` |
| Entity id in path | `client-galleries/{galleryId}/`, `site/media-kits/{type}/{id}/` |
| Timestamp + filename | `{ts}-{safeName}` on many upload-url routes |
| Random suffix | `portfolio-public/{ts}-{rand}.{ext}` |
| Generated derivative | `client-galleries/{id}/low-res/{imageId}-{stem}.jpg` |

**Existing keys must remain valid** — migration must not rewrite paths without explicit CMS/DB rewrite tooling (`rewrite-refs`, `mirotech-cms-rewrite`).

---

## 4. Upload workflows (discovered)

| Flow | Entry | Key pattern | Vault | DB field |
| --- | --- | --- | --- | --- |
| Portfolio (legacy) | `POST /api/admin/upload-url` | `portfolio/{cat}/{slug}/{ts}-{name}` | brightline | `PortfolioImage.storageKey` |
| Portfolio public drop | `POST /api/admin/portfolio/upload-url` | `portfolio-public/{ts}-{rand}.{ext}` | brightline | — |
| Generic R2 hub | `POST /api/admin/r2/upload-url` | User prefix + filename | either | varies |
| Client gallery | `POST /api/admin/galleries/[id]/upload-url` | `client-galleries/{id}/{ts}-{name}` | brightline | `GalleryImage.storageKey` |
| Site CMS media | `POST /api/admin/site-media/upload-url` | `site/{pages\|services\|...}/{ts}-{name}` | brightline | CMS JSON / `SiteSetting` |
| Site backgrounds | `POST /api/admin/site-backgrounds/upload-url` | `site/backgrounds/{full\|web\|posters}/...` | brightline | `SiteBackgroundVideo.*` |
| Work project media | `POST /api/admin/work-projects/[id]/upload-url` | work project paths | brightline | `WorkProject`, `MediaAsset` |
| Image Port (T9) | `POST /api/admin/image-port/upload-url` | T9 tree under `portfolio/` or `mirotech/` | brightline | Studio / portfolio |
| Video Port | multipart under `tmp/video-port/` | → final T9 path | brightline | — |
| Automation ingest | `POST /api/media/upload` | sharp encode + `putObjectBuffer` | brightline | pipeline |
| Accountant receipts | `POST /api/accountant/receipts/upload-url` | `accounting/receipts/{YYYY}/{MM}/{uuid}-...` | brightline | `AccountingReceipt.r2Key` |
| Studio receipts | `POST /api/studio/receipts/sign-upload` | `studio-os/receipts/...` | brightline | `StudioExpense.receiptKey` |
| R2 multipart | `POST /api/admin/r2/multipart/*` | staging → final key | either | — |
| Attach existing | `POST /api/media/attach-existing` | existing keys | either | Studio CMS |

**Authorization:** Admin cookie on `/api/admin/*`; automation token on `/api/media/upload`; accountant/studio portals on respective routes. MIME allowlist via `lib/upload-mime.ts` / `lib/truth/security.ts`.

---

## 5. Delivery workflows (discovered)

| Flow | Mechanism | Key access |
| --- | --- | --- |
| Public marketing images | `GET /api/media/public?key=` → presigned GET (3600s) or `proxy=1` same-origin | `isAllowedPublicMediaKey` |
| Admin preview (private) | `GET /api/admin/media/sign?key=` | `isAdminSignableMediaKey` + admin session |
| Admin any vault | `GET /api/admin/r2/sign?vault=&key=` | R2 manager allowlist per vault |
| Client gallery view | `POST /api/client/gallery` — signs low-res/full keys | Client HMAC session + private prefixes |
| Client download/ZIP | `POST /api/client/download` | Same |
| Delivery packages | `/api/package/[token]/items/.../preview\|download` | Package token + key policy |
| Final packages | `/api/final-package/...` | Token + rate limits |
| Render-time URL | `lib/r2.ts` `resolveStoredMediaUrl` | Stores **object key** in DB; builds `/api/media/public?key=` at render |
| Mirotech CDN | Pass-through URLs in `lib/r2.ts` | `media.mirotech.solutions`, `*.mirotech.solutions` |
| Direct public R2 base | `getPublicR2Url` / `R2_PUBLIC_URL` | Legacy; prefer proxy route for public keys |

**DB convention:** Persist **object keys** (or stable CDN URLs for Mirotech-site picks), not presigned URLs.

---

## 6. Database media models

| Model | Storage-related fields | Notes |
| --- | --- | --- |
| `PortfolioProject` | `coverStorageKey` | Legacy portfolio |
| `PortfolioImage` | `storageKey` | |
| `GalleryImage` | `storageKey`, `lowResStorageKey` | Private gallery |
| `GalleryVideo` | `storageKey`, `posterKey` | |
| `MediaAsset` | `keyFull`, `keyThumb`, `posterKey` | Work project media |
| `DeliveryPackageItem` | `storageKey` | Token packages |
| `StudioMedia` | `r2KeyFull`, `r2KeyThumb` | Studio OS |
| `SiteBackgroundVideo` | `storageKey`, `webStorageKey`, `posterKey` | |
| `WorkProject` | `backgroundMediaUrl`, `backgroundPosterUrl` | Often keys or resolved URLs in JSON |
| `StudioProject` | `backgroundMediaUrl`, `backgroundPosterUrl` | CMS JSON |
| `DesignProject` | `ogImageKey` + block `imageKey` in JSON | |
| `StudioInvoice` | `pdfStorageKey` | |
| `StudioExpense` | `receiptKey` | |
| `GeneratedDocument` | `draftPdfKey`, `signedPdfKey` | |
| `AccountingReceipt` / `AccountingDocument` | `r2Key` | |

**Not stored:** bucket name, presigned URLs (by convention). Dimensions/size may live on `GalleryImage` / ingest metadata.

**Future platform `Asset` table:** Not created in Phase 3A — see ADR-004.

---

## 7. Direct R2 coupling (migration candidates)

| Location | Category | Notes |
| --- | --- | --- |
| `lib/storage-r2.ts`, `lib/storage-r2-public.ts` | **A — infrastructure** | Correct layer for S3Client |
| `lib/r2-vaults.ts`, `lib/storage.ts` | **A/B** | Credential + facade |
| `lib/r2.ts`, `lib/media-key-access.ts` | **B — service** | URL + policy |
| `app/api/admin/r2/*`, upload-url routes | **B** | Route handlers compose storage |
| `lib/admin-r2-manager.ts`, unified media scans | **B** | Admin tooling |
| `components/admin/*`, `StudioHubEditor` | **D — UI** | Hard-coded CDN URLs, browse picks |
| `lib/dual-brand/content-api.ts` | **C** | Mirotech hero URLs as strings |
| `WorkProject` / CMS JSON URL fields | **C** | Mixed keys and absolute URLs |

**Phase 3B+:** Migrate **C/D** callers to `MediaService`; keep **A** as `R2MediaProvider`.

---

## 8. Public / private behavior

| Prefix class | Anonymous access | Delivery |
| --- | --- | --- |
| Public prefixes | `/api/media/public` (rate-limited) | Proxy or 302 presigned |
| Private prefixes | Denied on public route | Admin sign or client/package token |
| Mirotech-site objects | Not served via Brightline public route | CDN or admin sign |
| `journal/` | Not on public route | Admin sign only |

---

## 9. Significant architectural risks

| Risk | Severity | Notes |
| --- | --- | --- |
| Dual vault from single deploy | Operational | Mirotech media depends on Brightline env + admin |
| Mixed URL vs key in CMS JSON | Medium | Move/rename requires rewrite tooling |
| Hard-coded CDN URLs in admin UI | Low–medium | Drift if CDN domain changes |
| Public route prefix allowlist | Mitigated | Traversal blocked; rate limits applied |
| Cross-vault admin move | Medium | `move` route copies bytes through Vercel (Hobby transfer budget) |
| No platform Asset registry yet | Low (future) | Ref tracking spread across admin audit modules |

**No critical unresolved security issue** found that would require stopping Phase 3A (credentials server-only; private keys gated; MIME allowlist enforced on uploads).

---

## 10. Migration seams

| Seam | Phase |
| --- | --- |
| `lib/platform/media/*` | 3A contracts (this phase) |
| `R2MediaProvider implements MediaProvider` | 3B — wrap `lib/storage-r2.ts` |
| `DefaultMediaService implements MediaService` | 3B — delegate to provider + `media-key-access` |
| `PLATFORM_MEDIA_ENABLED` | Route one read path behind flag |
| `lib/r2.ts` `resolveStoredMediaUrl` | Later consumer migration |
| `lib/asset-health/registry.ts` | Future unified asset refs |
| Admin R2 manager | Last to migrate (highest surface area) |

---

## Related modules (quick index)

- **Policy:** `lib/media-key-access.ts`
- **Public delivery:** `app/api/media/public/route.ts`
- **Client delivery:** `lib/gallery-delivery-assets.ts`, `app/api/client/gallery/route.ts`
- **Mirotech CMS keys:** `lib/admin-r2-mirotech-cms-keys.ts`
- **Unified admin media:** `lib/admin-r2-unified-media-sort.ts`, `lib/admin-media-library.ts`
- **Platform contracts:** `lib/platform/media/` (Phase 3A)
