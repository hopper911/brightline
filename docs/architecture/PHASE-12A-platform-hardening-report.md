# PHASE 12A — Platform API Hardening Report

**Date:** 2026-08-28  
**Branch:** `architecture/platform-foundation`  
**Scope:** Platform-facing HTTP routes, Studio publishing proxies, and internal platform services invoked from admin/studio.

---

## 1. Endpoints reviewed

### Public platform (`/api/platform/*`)

| Route | Method | Auth | Notes |
| --- | --- | --- | --- |
| `/api/platform/health` | GET | Public (intentional) | Liveness only; no secrets |
| `/api/platform/sso/redeem` | GET | Token + state + nonce cookie | Cross-domain SSO redeem |

### Admin platform (`/api/admin/platform/*`)

| Route | Method | Auth | Notes |
| --- | --- | --- | --- |
| `/api/admin/platform/health` | GET | `authorizeAdminRequest` | Extended health |
| `/api/admin/platform/metrics` | GET | Admin | Operational metrics |
| `/api/admin/platform/identity/me` | GET | Admin + RBAC probe | Platform user resolution |
| `/api/admin/platform/authorization/me?tenant=` | GET | Admin + `platform.identity.read` | Effective permissions |
| `/api/admin/platform/jobs/[jobId]` | GET | Admin + tenant-scoped publishing RBAC | **Hardened in 12A** |
| `/api/admin/platform/sso/start` | GET | Admin | SSO exchange start |
| `/api/admin/platform/sso/status` | GET | Admin | SSO config probe |

### Studio publishing proxies (platform jobs / publishing)

| Route | Method | Auth | Notes |
| --- | --- | --- | --- |
| `/api/studio/publishing/sync-blog` | POST | Admin + publish RBAC | **Rate limited in 12A** |
| `/api/studio/publishing/jobs/[jobId]/retry` | POST | Admin + tenant publish RBAC | **Rate limited in 12A** |
| `/api/studio/ops/tenant` | POST | Admin + membership check | Validates tenant against memberships |

### Internal platform domains (no dedicated `/api/platform/{content,media,publishing,jobs,auth}` REST trees)

Content, media, publishing, jobs, and identity are **server-only libraries** consumed by Studio pages and admin routes:

- `lib/platform/content/*` — content refs, validation
- `lib/platform/media/*` — asset resolution
- `lib/platform/publishing/*` — enqueue + hub integrations
- `lib/platform/jobs/*` — job repository, handlers, drain
- `lib/platform/identity/*`, `lib/platform/authorization/*` — RBAC + SSO
- `lib/studio/content/*`, `lib/studio/media/*`, `lib/studio/publishing/*` — Studio list/actions

Studio list/mutation surfaces are primarily **RSC pages** with explicit permission gates in `lib/studio/access.ts` and `resolveStudioOpsContext()`.

---

## 2. Authentication findings

| Surface | Status |
| --- | --- |
| Public health | Correctly unauthenticated |
| SSO redeem | No session required; cryptographic token exchange |
| All admin/studio mutations | Require `authorizeAdminRequest` (legacy admin cookie or platform staff session) |
| Platform identity probes | Admin-only |

**No unauthenticated mutation endpoints found** in the platform inventory.

---

## 3. Authorization findings

### Fixed (12A)

**`GET /api/admin/platform/jobs/[jobId]`** previously allowed any authenticated admin to read any job by UUID, including full Mirotech CMS payloads (`hubProject`, `hubBlog`) regardless of tenant membership.

**Fix:** Route now resolves `StudioOpsContext` and enforces `canReadPlatformPublishingJob()`:

- Membership in `record.tenantSlug`
- Publishing visibility (`canViewStudioPublishing`)
- Tenant-specific publish permission (`canRetryPublishingJob` for job tenant)

Cross-tenant or under-privileged access returns **404** (no job enumeration).

### Already sound

- **`POST /api/studio/ops/tenant`** — `tenantAllowedForMemberships()`; does not trust client tenant alone
- **`POST /api/studio/publishing/jobs/[jobId]/retry`** — validates tenant + `canRetryPublishingJob`
- **`GET /api/admin/platform/authorization/me`** — `DefaultAuthorizationService` returns empty permissions when platform user lacks membership in requested tenant; legacy admin bypass is explicit

### Deferred (by design / lower severity)

- **Legacy admin bypass** — cookie-based admin sessions receive OWNER-equivalent access on both tenants until identity migration completes (`lib/studio/access.ts`, `legacy-admin-grant.ts`)
- **Studio finance/tasks/schedule APIs** — admin-cookie only; no platform RBAC yet (outside platform domain scope)

---

## 4. Validation

| Input | Validation |
| --- | --- |
| Tenant slug | `parseTenantSlugParam`, body parsers, Prisma tenant FK |
| Job ID | Trim + existence check; 404 on deny |
| `postId` (sync-blog) | Required string trim |
| Content refs | `assertValidContentRef` in publishing payloads |
| Publish targets/ops | `isPublishTargetId`, `isPublishOperation` in job payload parsers |

No new validation library added; existing TypeScript guards and platform payload parsers retained.

---

## 5. Mass-assignment protection

Studio task PATCH (`/api/studio/tasks/[id]`) builds explicit `Prisma.StudioTaskUncheckedUpdateInput` field-by-field — no spread of request body into Prisma.

Publishing enqueue paths use typed payload builders (`publishing-payload.ts`), not raw client objects.

Platform job read path does not mutate records.

---

## 6. Error handling

| Pattern | Usage |
| --- | --- |
| `{ ok: false, error: "..." }` | Normalized client JSON |
| 401 / 403 / 404 / 429 / 503 | Appropriate HTTP status |
| Job access deny | 404 `"Job not found."` — avoids cross-tenant ID oracle |
| SSO / publish rate limit | 429 `"Too many requests."` |

Server-side job handlers retain `errorSummary` and structured payload results for operators authorized to the tenant.

---

## 7. Rate controls

| Scope | Limit | Route |
| --- | --- | --- |
| `platform-sso-redeem` | 20 / 15 min | `/api/platform/sso/redeem` |
| `platform-sso-redeem-burst` | 5 / 1 min | `/api/platform/sso/redeem` |
| `studio-publish-sync-blog` | 30 / hour | `/api/studio/publishing/sync-blog` |
| `studio-publish-job-retry` | 40 / hour | `/api/studio/publishing/jobs/[jobId]/retry` |

Existing limits unchanged: admin login, R2 upload-url, AI routes, contact form, client access.

Ordinary internal reads (health, metrics, Studio content lists) intentionally **not** rate limited.

---

## 8. Major risks fixed

1. **Cross-tenant platform job read** — tenant-scoped RBAC on `GET /api/admin/platform/jobs/[jobId]`
2. **SSO redeem brute force** — IP rate limits on redeem endpoint
3. **Publish trigger abuse** — rate limits on sync-blog and job retry

### New modules

- `lib/platform/http/platform-job-access.ts` — tenant-scoped job read gate
- `lib/platform/http/job-poll-view.ts` — admin poll response builder (hub payloads only after auth)
- `lib/platform/http/platform-job-access.test.ts` — security boundary tests

---

## 9. Deferred risks

| Risk | Rationale |
| --- | --- |
| Legacy admin full bypass | Dual-auth migration path; documented in frozen truth |
| Studio non-platform APIs (finance, tasks, email) | Admin cookie only; platform RBAC not yet wired |
| Task PATCH enum values | Prisma rejects invalid enums; explicit enum guard optional follow-up |
| SSO start endpoint rate limit | Admin-authenticated; lower abuse surface than public redeem |
| Hub payload in authorized poll responses | Required for `StudioHubEditor` async publish UX; scoped to authorized tenant |

---

## 10. Validation (tests)

Added `lib/platform/http/platform-job-access.test.ts`:

- Wrong tenant → denied
- Missing publish permission → denied
- Matching tenant + publish permission → allowed
- Legacy admin with membership → allowed
- `parseTenantSlugParam` rejects unknown tenants

Run: `npm test -- lib/platform/http/platform-job-access.test.ts`

Full suite should remain green (`npm test`).

---

## Summary

Platform HTTP surface is smaller than the `/api/platform/{domain}/*` tree suggested — domains are internal services behind admin/studio guards. The highest production risk was **unscoped job polling leaking cross-tenant CMS payloads**; that is now closed with tenant-scoped RBAC and uniform 404 denials. SSO redeem and publish triggers received proportionate rate limits without throttling routine internal reads.
