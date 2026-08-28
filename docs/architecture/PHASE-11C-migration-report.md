# Phase 11C — Feature flag consolidation

**Date:** 2026-08-28  
**Branch:** `architecture/platform-foundation`  
**Runtime behavior change:** **NONE**

---

## 1. Flags reviewed

### Platform migration flags (`lib/platform/features.ts`)

| Key | Env var | Category | Default | Status |
| --- | --- | --- | --- | --- |
| content | `PLATFORM_CONTENT_ENABLED` | migration-only | false | **Retained** — dual path in work preview + Studio |
| media | `PLATFORM_MEDIA_ENABLED` | migration-only | false | **Retained** — 6 upload/sign routes + gallery |
| assets | `PLATFORM_ASSET_REGISTRY_ENABLED` | migration-only | false | **Retained** — registry no-op when off |
| assetRead | `PLATFORM_ASSET_READ_ENABLED` | migration-only | false | **Retained** — legacy read fallback |
| publishing | `PLATFORM_PUBLISHING_ENABLED` | migration-only | false | **Retained** — legacy sync default |
| identity | `PLATFORM_IDENTITY_ENABLED` | migration-only | false | **Retained** — on in prod env snapshot |
| jobs | `PLATFORM_JOBS_ENABLED` | migration-only | false | **Retained** — sync fallback when off |
| audit | `PLATFORM_AUDIT_ENABLED` | migration-only | false | **Retained** — audit writes skipped when off |

### Emergency / parallel legacy

| Env var | Category | Default | Status |
| --- | --- | --- | --- |
| `LEGACY_ADMIN_HANDOFF_ENABLED` | emergency-fallback | **true** | **Retained** — ho1 handoff active |

### Permanent configuration (not migration flags)

| Env var | Purpose | Status |
| --- | --- | --- |
| `PLATFORM_SSO_EXCHANGE_SECRET` | SSO token signing | **Retained** |
| `PLATFORM_SSO_NONCE_STORE` | Dev nonce backend (`memory`) | **Retained** |
| `AI_OPS_UNIFIED` | AI invocation DB audit opt-out | **Retained** (product ops) |
| `SENTRY_ENABLE` | Error reporting in non-prod | **Retained** (product ops) |

---

## 2. Flags removed

**None.**

All reviewed `PLATFORM_*` flags still gate active dual-path or emergency rollback code (Phase 11A class **B**). Removing any env var would not simplify runtime — it would break rollback without removing legacy branches first.

---

## 3. Flags retained

All eight `PLATFORM_*` migration flags plus `LEGACY_ADMIN_HANDOFF_ENABLED` and SSO/config secrets listed above.

Canonical registry exported as:

- `PLATFORM_FEATURE_ENV_KEYS`
- `PLATFORM_FLAG_REGISTRY`
- `LEGACY_HANDOFF_FLAG`
- `parsePlatformEnvFlag()`

---

## 4. Dead branches / code removed

| Removed | Reason |
| --- | --- |
| `PlatformAssetRef` type + barrel export | Zero consumers; superseded by `PlatformMediaAssetRef` |
| `PlatformSignedUrlOptions` type + barrel export | Zero consumers; superseded by `MediaUploadRequest` |
| `PlatformContentRef` public barrel exports | Zero external imports; type + mappers kept in `content/types.ts` for tests |
| Duplicate `parseEnvFlag` in `handoff-config.ts` | Consolidated into shared `parsePlatformEnvFlag` |

**Not removed:** any `if (isPlatformFeatureEnabled(...))` dual-path branch.

---

## 5. Environment docs updated

- `.env.example` — full `PLATFORM_*` block with comments + handoff note
- `docs/deployment.md` — new “Platform migration flags” section
- `docs/architecture/legacy-retirement-plan.md` — 11C status

No secret values added.

---

## 6. Validation

- `npx tsc --noEmit` — pass
- `npm test` — 512 tests pass
- Grep: no remaining `PlatformAssetRef`, `PlatformSignedUrlOptions`, or `platformFeatures` in app code

---

## 7. Runtime behavior change

**NONE.**

- Flag resolution logic unchanged (same true-like parsing, same defaults).
- Handoff still defaults **on** when unset.
- All dual-path routes behave identically for every env combination.

---

## Rollback

```bash
git revert <phase-11c-commit-sha>
```

Restores deprecated barrel exports and duplicate handoff parser only — no env or schema changes.

---

## Next (11D+)

Remove `PLATFORM_*` env vars only **after** corresponding legacy branches are deleted (Phase 11A batch 5–6) with ≥2 weeks production evidence per domain.
