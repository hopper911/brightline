# ADR-004: MediaService Boundary

**Status:** Accepted  
**Date:** 2026-08-28  
**Depends on:** [ADR-001](./ADR-001-platform-foundation.md), [ADR-002](./ADR-002-tenant-context.md), [ADR-003](./ADR-003-audit-events.md)

## Context

Brightline, Studio, and Mirotech CMS media all use Cloudflare R2 via `lib/storage-r2.ts`, dual vault credentials, and dozens of upload/delivery routes. Application and UI code often knows object key prefixes, vault ids, presign details, and CDN URLs directly.

Production R2 objects and keys **must remain valid** — this is live storage.

## Decision

Introduce an application-facing **MediaService** and infrastructure **MediaProvider** in `lib/platform/media/` (Phase 3A: **types and interfaces only**).

```
Applications (Brightline, Studio admin, future Mirotech consumers)
        │
        ▼
   MediaService          ← tenant-aware, visibility policy, stable API
        │
        ▼
   MediaProvider         ← R2MediaProvider (Phase 3B)
        │
        ▼
   lib/storage-r2.ts / Cloudflare R2
```

### Why this boundary exists

- Hide S3Client, bucket names, and presigner details from business logic
- Centralize public vs private delivery rules (today in `media-key-access.ts`)
- Enable tenant-scoped metadata without moving objects
- Support incremental strangler migration behind `PLATFORM_MEDIA_ENABLED`

### Tenant awareness

`MediaService` methods accept `PlatformContext`. Tenant slug determines **ownership metadata** and default vault hint (`defaultVaultForTenant`) — **not** storage path rewrites in early phases.

Brightline portfolio keys under `portfolio/` remain on the brightline vault even when tenant context is `brightline`. Mirotech CMS keys on `mirotech-site` vault map to tenant `mirotech`.

### Provider independence

`MediaProvider` is the only layer that should know R2 endpoints and buckets. `R2MediaProvider` (Phase 3B) wraps existing `signPut` / `signGet` / `HeadObject` from `lib/storage-r2.ts`.

### Backward compatibility

- No object migration
- No bucket consolidation or rename
- No change to `/api/media/public` or upload routes in Phase 3A
- DB continues storing object keys (not presigned URLs)
- Existing `PlatformAssetRef` (Phase 1A) deprecated in favor of `MediaObjectRef` / `PlatformMediaAssetRef`

### URL semantics (typed)

| Type | Meaning | Persist in DB? |
| --- | --- | --- |
| `MediaObjectRef` | vault + objectKey | Yes (key only) |
| `PublicMediaDeliveryUrl` | Stable app route (`/api/media/public?key=`) | No |
| `SignedMediaReadUrl` | Short-lived presigned GET | **Never** |
| `MediaSignedUpload` | Short-lived presigned PUT | **Never** |

### Incremental adoption

1. **3A** — contracts + inventory (this ADR)
2. **3B** — `R2MediaProvider` + `DefaultMediaService`, flag-gated
3. **3C+** — migrate one delivery/read consumer at a time
4. **Later** — optional `Asset` registry table; link DB rows to platform asset ids

### Failure strategy

MediaService implementation (3B) must mirror audit policy: delivery failures surface to caller; optional operations may degrade when flag off and legacy path remains default.

## Contracts (Phase 3A)

**MediaService:** `createUpload`, `getAssetUrl`, `createDownloadUrl`, `exists`

**MediaProvider:** `signPut`, `signGet`, `headObject`, `exists`

See `lib/platform/media/media-service.ts` and `media-provider.ts`.

## Consequences

**Positive:** Clear migration target; tenant-aware API ready; inventory documented in `media-current-state.md`

**Negative:** Temporary duplication alongside `lib/storage.ts` until consumers migrate

## Rollback

1. Remove `lib/platform/media/server.ts` and provider/service implementation files
2. Phase 3A types remain; no production routes import `defaultMediaService` in 3B
3. No database changes to revert

## Phase 3B implementation (2026-08-28)

| Component | Role |
| --- | --- |
| `R2MediaProvider` | Wraps `lib/storage-r2.ts` (`signPut`, `signGet`, `headObject`) — reuses S3Client cache |
| `DefaultMediaService` | Application layer; public keys → `/api/media/public`, private → presigned GET |
| `lib/platform/media/server.ts` | Server-only exports + `defaultMediaService` singleton |
| `verifyMediaProviderConfiguration()` | Dev smoke — credential check only, no writes |

Import `@/lib/platform/media/server` in route handlers only. **No existing upload/delivery routes migrated in 3B.**

## Phase 3C implementation (2026-08-28)

**First consumer:** `POST /api/admin/site-media/upload-url` (admin CMS media upload URL).

| Behavior | Detail |
| --- | --- |
| Flag | `PLATFORM_MEDIA_ENABLED` — default **off** (legacy `signPut` path) |
| Parity | Same bucket (`brightline`), key (`site/{folder}/{ts}-{name}`), response `{ ok, url, headers, key, publicUrl }`, public-read ACL, 3600s presign default |
| Audit | Optional `media.upload_url.created` via `recordAuditSafely` on platform path only |
| Rollback | Set `PLATFORM_MEDIA_ENABLED=false` |

## References

- [`media-current-state.md`](./media-current-state.md)
- `lib/storage-r2.ts`, `lib/r2.ts`, `lib/media-key-access.ts`
