# SECURITY REVIEW — PHASE 17

**Project:** Brightline Photography ↔ MiroTech Solutions  
**Date:** 2026-08-29  
**Scope:** Defensive threat model for the dual-brand platform architecture  
**Repos:** `brightline` (platform + Brightline deploy) · `mirotech-solutions` (MiroTech public site + admin)

This document describes realistic risks for this stack. It does not catalog every theoretical web vulnerability.

---

## 1. Trust boundaries

| Boundary | What crosses it | Controls |
| --- | --- | --- |
| **Browser ↔ Brightline app** | HTML, cookies, CSP, form/API mutations | CSP nonce (`proxy.ts`, `lib/csp.ts`); operator CSRF on `/api/admin`, `/api/studio`, `/api/accountant`, `/api/ai`; `admin_access` HMAC cookie for `/admin` + `/studio` pages and APIs |
| **Browser ↔ MiroTech app** | Same pattern, separate Vercel project | `proxy.ts` + `rejectCrossSiteMutation`; `admin_access` cookie; no Studio/accountant surface |
| **Brightline ↔ platform layer** | Studio ops, publishing, jobs, identity | Feature flags (`lib/platform/features.ts`); tenant slug on platform records; legacy admin bypass when identity off |
| **MiroTech ↔ platform layer** | Content ingest API, SSO redeem, handoff | Bearer secrets on `/api/content/v1/*`; SSO exchange tokens; legacy `ho1` handoff HMAC |
| **Studio ↔ platform** | Publishing jobs, hub sync, tenant-scoped ops | `resolveStudioOpsContext()` + permission checks on Studio routes; tenant cookie `STUDIO_OPS_TENANT_COOKIE` |
| **Platform ↔ Postgres (Neon)** | All CMS, galleries, jobs, identity | Single logical DB; app-layer tenant fields; **no Postgres RLS** |
| **Platform ↔ R2** | Public marketing assets vs private vault | Prefix policy (`lib/media-key-access.ts`); signed GET URLs; vault separation (`brightline` vs `mirotech-site`) |
| **Job provider ↔ application** | Cron drain, async publishing | `guardCronBearer()` (`CRON_SECRET`); `PLATFORM_JOBS_ENABLED`; job handlers read tenant from job record |
| **Client browser ↔ delivery APIs** | Gallery codes, package tokens, downloads | HMAC session cookies; token-scoped routes; rate limits; no operator CSRF (session-bound) |
| **Automation ↔ APIs** | Airtable/n8n-style integrations | `requireProjectsApiAuth()` — admin cookie **or** bearer (`AUTOMATION_API_SECRET` / `BL_INTERNAL_API_TOKEN`) |

**Diagram (simplified):**

```
[Public browser] ──CSP/ISR──► [Brightline / MiroTech Next.js]
[Operator browser] ──CSRF+cookie──► [/admin · /studio · /accountant APIs]
[Client browser] ──code/session──► [/api/client · /api/package · /api/final-package]
[Cron (Vercel)] ──CRON_SECRET──► [/api/cron/*]
[Mirotech site] ──Bearer──► [/api/content/v1/*] (Mirotech deploy)
[Platform jobs] ──internal──► [Prisma Postgres] + [R2 via S3 SDK]
```

---

## 2. Protected assets

| Asset | Why it matters | Primary storage / surface |
| --- | --- | --- |
| **Admin sessions** | Full Mission Control + Studio access | `admin_access` HMAC cookie (`lib/admin-session.ts`); optional `platform_staff_session` after SSO |
| **Accountant sessions** | Financial receipts, exports | JWT `accountant_session` (`lib/accountant/auth.ts`) |
| **Client gallery access** | Private client photography, selections | `galleryAccessToken` (hashed codes), `client_access_session` cookie |
| **Private photography** | Client vault, delivery packages | R2 prefixes `client-galleries/`, `delivery/`; never via `/api/media/public` |
| **Database records** | Clients, projects, galleries, platform jobs, audit | Neon Postgres via Prisma |
| **Publishing privileges** | Cross-site content mutation (Mirotech journal, hub) | Studio publishing APIs; `defaultPublishingService` (caller must auth) |
| **R2 assets** | All site and client media | Cloudflare R2; credentials in env only |
| **Environment secrets** | Session signing, cron, handoff, automation, R2, DB | Vercel env; `ADMIN_SESSION_SECRET`, `ADMIN_ACCESS_CODE`, `CRON_SECRET`, `MIROTECH_*`, `AUTOMATION_API_SECRET`, etc. |

---

## 3. Critical threats

**None identified as an unauthenticated remote compromise path in the current production baseline**, assuming standard deploy hygiene (secrets set, HTTPS only, no public env leakage).

The following become **operationally critical** if secrets leak or flags are mis-set:

| Condition | Impact |
| --- | --- |
| `ADMIN_ACCESS_CODE` or `ADMIN_SESSION_SECRET` leaked | Attacker mints valid admin session → full Mission Control (publish, delete media, galleries, R2) |
| `AUTOMATION_API_SECRET` / `BL_INTERNAL_API_TOKEN` leaked | Bearer auth to automation-gated APIs without browser session |
| `CRON_SECRET` leaked + jobs enabled | Job drain / scheduled mutations invoked by attacker |

These are credential-theft / misconfiguration classes, not missing auth on a public route.

---

## 4. High threats

| Threat | Realistic scenario | Current state |
| --- | --- | --- |
| **Privilege concentration (binary admin)** | Any valid `admin_access` cookie can mutate ~all `/api/admin/*` routes | `authorizeAdminRequest` only; platform RBAC **not** enforced on Mission Control mutations (`docs/architecture/authz-current-state.md`) |
| **Cross-brand operator scope** | Legacy admin session crosses Brightline + MiroTech data without tenant filter on many queries | Single operator pool; `legacyAdminEffectivePermissions()` grants synthetic OWNER on both tenants in Studio when identity enabled |
| **Publishing abuse** | Operator (or stolen admin session) pushes content to Mirotech or hub | Studio routes check publish permissions; most admin publish paths rely on admin cookie only; `defaultPublishingService` does not authenticate internally |
| **IDOR via platform job APIs** | Attacker passes another tenant’s `jobId` | Mitigated where `canReadPlatformPublishingJob` uses **job record tenant**, not client param (`lib/platform/http/platform-job-access.ts`) |
| **Legacy handoff token abuse** | Short-lived HMAC used for Brightline → Mirotech admin | `ho1` handoff parallel to SSO (`lib/mirotech-admin-handoff.ts`); redirect path sanitized; requires existing Brightline admin session to mint |
| **SSO token interception** | Exchange token redeemed by wrong party | 30–120s TTL, audience binding, state cookie, nonce single-use (`sso-exchange-service.ts`); rate limits on redeem |
| **Private media exfiltration via signing** | Guess object keys, obtain signed URLs | Private prefixes blocked on `/api/media/public`; admin sign requires session + prefix check; client downloads require gallery session + image-in-gallery checks |
| **Automation bearer scope** | Leaked bearer used for broad project API writes | `requireProjectsApiAuth` grants same access as admin for matched routes — no per-integration scoping |
| **Accountant portal edge gap** | Unauthenticated fetch of accountant pages before layout redirect | `/accountant` pages not in `proxy.ts` cookie gate; APIs have CSRF but not edge session check |
| **Overly broad AI credentials** | Server uses provider keys with wide account scope | AI routes admin-gated; chat blocks remote `image_url`; outbound fetches use `safe-fetch-image` / host allowlists — provider key blast radius is still account-wide at vendor |

---

## 5. Medium threats

| Threat | Notes |
| --- | --- |
| **Gallery access code brute force** | 12-char unambiguous alphabet (~31^12); `codeHint` narrows DB lookup; rate limit 10/15min on `/api/client/access` |
| **Client session fixation / CSRF** | Session cookie `SameSite=lax`, httpOnly; client POST mutations lack CSRF — acceptable for session-only client surface; risky if future operator actions added to `/api/client` |
| **Signed URL leakage** | Client gallery view/download TTL 600s (`lib/signed-url-ttl.ts`); public media redirect signs up to 3600s — leaked URL is time-bounded, not revocable per-user |
| **Upload size inconsistency** | Limits vary by route (3.5 MB – 250 MB); MIME enforced centrally but size is not in `lib/truth/security.ts` |
| **Server-side injection** | Prisma parameterized queries; Zod on many APIs; HTML sanitized for client preview (`sanitizeHtmlForClientPreview`) — residual risk on unsanitized rich text surfaces |
| **XSS** | CSP `script-src` nonce + `strict-dynamic`; `style-src 'unsafe-inline'` remains; inline style attrs not fully eliminated |
| **Job replay (application layer)** | Cron bearer required; job idempotency depends on handler design; platform job payloads reject secrets (`ADR-008`) |
| **Platform audit off by default** | `PLATFORM_AUDIT_ENABLED` default false — security events may be invisible until enabled |
| **Mirotech standalone admin** | Separate `ADMIN_ACCESS_CODE` / session on `mirotech.solutions` — second credential surface to protect |

---

## 6. Media / upload risks

| Control | Implementation | Gap |
| --- | --- | --- |
| **MIME validation** | `ALLOWED_UPLOAD_MIME_TYPES` / `FORBIDDEN_UPLOAD_CONTENT_TYPES` in `lib/truth/security.ts`; `normalizeUploadContentType()` on signed PUT routes | Not all routes may call normalizer — pattern is established on R2/gallery/port routes |
| **No SVG/HTML uploads** | Forbidden types locked in truth tests | Client `Content-Type` on PUT still untrusted — R2 object metadata follows declared type |
| **Size limits** | Per-route caps (e.g. compact-upload 3.5 MB, work upload 250 MB) | No single canonical limit module |
| **Object-key handling** | `cleanR2Key()`, reject `..`, `\0`, `\`; `assertR2ManagerKeyAllowed()` for admin R2 manager | Operator can still write within allowed prefixes |
| **Filename handling** | `safeFileName()` strips path segments in upload-url routes | — |
| **Bucket destination** | Public prefixes vs `client-galleries/`, `delivery/`, `accounting/` | Enforced at sign + public proxy layers |
| **Authorization** | `authorizeAdminRequest` + `assertSameOriginAdminMutation` + rate limits on admin uploads | No `platform.media.write` permission check on most routes |

**Do not rely on client MIME alone** — server normalizes and gates content type before issuing signed PUT URLs; bytes land in operator-chosen keys within prefix allowlists.

---

## 7. Gallery risks

| Question | Assessment |
| --- | --- |
| **Gallery IDs guessable?** | Public URLs use `gallerySlug` (not raw cuid). Access is code-gated, not ID-gated. |
| **Access codes protected?** | Stored as salted SHA-256; verified with `timingSafeEqual`; generic errors; hint index only for lookup |
| **Signed links expire?** | Yes — 600s for client view/download; package/final-package TTLs enforced |
| **Private assets isolated?** | `client-galleries/` not servable via `/api/media/public`; downloads require session + `guardImageInClientGallery()` |
| **Downloads authorized?** | `allowDownload` flag; `maxDownloads` cap; rate limit 60/hr/IP; ZIP capped (`MAX_ZIP_FILES`) |

**Residual:** URL in `/client/access/[token]` may expose slug in path after code exchange — session cookie is the ongoing gate. Legacy bare `client_access_id` cookie rejected.

---

## 8. SSO risks

| Control | Status (`lib/platform/identity/sso/`) |
| --- | --- |
| **State** | `platform_sso_state` cookie must match query `state` on redeem |
| **Audience** | Token `audience` must match host-derived site audience |
| **Expiry** | Exchange token 30–120s; staff session 8h |
| **Single-use / replay** | Nonce consumed once in `platformSsoExchangeNonce` (Prisma or memory store) |
| **Redirect allowlist** | Origins: brightlinephotography.com, mirotech.solutions (+ www); paths only `/admin` or `/studio`; blocks `..` and `\` |
| **Session fixation** | New staff session minted on redeem; separate from legacy `admin_access` until cutover |

**Gaps:** SSO opt-in (`PLATFORM_IDENTITY_ENABLED` / `isPlatformSsoEnabled()`); legacy admin cookie + `ho1` handoff remain primary; redeem rate-limited but no CAPTCHA.

---

## 9. RBAC risks

Platform RBAC exists (`lib/platform/authorization/`) but is **not the effective control** for most Mission Control mutations today.

| High-impact permission | Enforced today? |
| --- | --- |
| **Publishing** (Mirotech journal, hub sync) | Studio: yes (`canRetryPublishingJob`, etc.). Admin publish passthrough: admin cookie only |
| **Media deletion** (R2 delete, gallery assets) | Admin cookie + CSRF + rate limit — no `platform.media.write` |
| **User administration** | No production user-admin API with RBAC; identity probe routes only |
| **Audit access** | Platform audit flag-gated; accountant has separate `AccountantAuditLog` |

**Studio** is ahead of Mission Control: `resolveStudioOpsContext()` merges legacy admin OWNER synthetic grant with membership permissions when identity is enabled.

---

## 10. Agent readiness

**AI agents are not production principals.** Operator-triggered AI (`/api/ai/chat`, alt-text) uses admin session + CSRF.

Scaffolding only:

- `lib/platform/authorization/agent-scopes.ts` — presets (`caseStudyDrafter`, `mediaReader`)
- `DefaultAuthorizationService` supports `subject.kind === "agent"` but **no agent auth flow**

**Required rules before any autonomous agent ships:**

1. **Service identity** — dedicated principal per agent/workflow (not `admin_access` cookie impersonation).
2. **Least privilege** — use `AgentScope` presets; deny publish, identity, and cross-tenant permissions by default.
3. **Scoped tenant access** — agent context must include explicit `tenantSlug`; never infer tenant from user input alone.
4. **No raw admin session impersonation** — agents must not receive operator cookies or `legacy_admin` synthetic OWNER.
5. **Outbound fetch** — must use `fetchTrustedImageBytes`, `assertPublicHttpUrlResolved`, `fetchPublicUrlBytes` (`SECURITY_MUST_USE` in `lib/truth/security.ts`).
6. **Audit** — enable platform audit for agent mutations; log actor `type: "AGENT"`.
7. **Publishing / jobs** — agents enqueue jobs or call publishing service only through permission-checked service layer, not direct admin routes.

---

## 11. Fixes completed (baseline already shipped)

| Area | Fix |
| --- | --- |
| **CSRF** | Edge + route-level `rejectCrossSiteMutation` on operator API prefixes; locked in `lib/truth/security.ts` |
| **CSP** | Nonce + `strict-dynamic` on matched routes |
| **Upload MIME** | Central allowlist; SVG/HTML/JS blocked; Vitest locks |
| **SSRF** | `ssrf-guard`, `safe-fetch-image`, `safe-fetch-url` with DNS resolve and host allowlists |
| **Client gallery** | HMAC `client_access_session`; gallery-scoped image checks; hashed access codes; rate limits |
| **R2 isolation** | Public vs private prefix policy; traversal rejection on public media route |
| **SSO exchange** | Short TTL, state, audience, nonce replay protection, redirect sanitization |
| **Cron** | `guardCronBearer` fails closed without `CRON_SECRET` |
| **Package / final-package** | Token-scoped downloads; expiry on final packages; per-token rate limits |
| **Session hardening** | Production requires `ADMIN_SESSION_SECRET`; legacy `"true"` cookie rejected |
| **Mirotech admin** | CSRF on admin APIs via `proxy.ts` (separate repo) |

---

## 12. Risks requiring future work

| Priority | Item | Recommendation |
| --- | --- | --- |
| **High** | Wire platform RBAC into `/api/admin/*` mutations | Replace binary admin check with `requirePermission()` per route class; keep legacy bypass only behind explicit flag during migration |
| **High** | Complete SSO cutover | Disable `ho1` handoff by default; retire shared `ADMIN_ACCESS_CODE` when `PlatformUser` login is primary |
| **High** | Publishing service caller contract | Enforce auth wrapper or middleware on all publishing entry points; document in service interface |
| **High** | Accountant edge gate | Add `/accountant` to `proxy.ts` session check (mirror admin) |
| **Medium** | Central upload size truth | Single module referenced by all upload-url routes |
| **Medium** | Enable platform audit in production | `PLATFORM_AUDIT_ENABLED` for SSO, publish, R2 delete, gallery token issuance |
| **Medium** | Tenant scoping on legacy admin queries | Filter Mission Control lists by active Studio tenant where dual-brand data mixes |
| **Medium** | Automation bearer scoping | Per-integration tokens with route/prefix limits |
| **Medium** | Agent principals | Implement service identity + scopes before expanding AI automation |
| **Low** | Postgres RLS | Optional defense-in-depth if multi-tenant queries grow |

---

## References

- `lib/truth/security.ts` — frozen CSRF / MIME contracts  
- `docs/architecture/authz-current-state.md` — authorization inventory  
- `docs/architecture/ADR-011-parallel-sso.md` — SSO design  
- `docs/architecture/media-current-state.md` — R2 and upload pipeline  
- `docs/architecture/system-overview.md` — security model overview  
- Mirotech: `proxy.ts`, `lib/admin-request-origin.ts` — operator CSRF on separate deploy
