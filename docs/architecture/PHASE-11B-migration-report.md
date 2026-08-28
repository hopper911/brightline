# Phase 11B — First legacy retirement batch

**Date:** 2026-08-28  
**Branch:** `architecture/platform-foundation`  
**Scope:** Remove three class-**D** items from Phase 11A plan §9 (shims/aliases only). No routes, schema, auth, handoff, or publishing fallback branches touched.

---

## 1. Items removed

| # | Removed | Replacement |
| --- | --- | --- |
| 1 | `lib/dual-brand/sync-journal.ts` | `@/lib/platform/publishing/mirotech/journal-ingest` |
| 2 | `lib/observability/log.ts` (`apiLog`) | `@/lib/observability/platform-log` (`platformLog`) |
| 3 | `platformFeatures` alias in `lib/platform/features.ts` | `getPlatformFeatures()` / `isPlatformFeatureEnabled()` |

---

## 2. Replacement path

- **Journal sync:** All imports now target `journal-ingest.ts` — the canonical owner since Phase 6D. Legacy `legacySyncBlogPostsMirotech` in `blog-mirotech-sync.ts` still calls `syncBlogPostsToMirotech` from that module (unchanged behavior).
- **Logging:** Callers emit structured JSON via `platformLog({ severity, service: "platform", action, message, meta })`.
- **Feature flags:** Runtime code already used `getPlatformFeatures()`; deprecated getter object removed from barrel export.

---

## 3. Evidence they were unused / safe

| Item | Caller audit (pre-delete) |
| --- | --- |
| `sync-journal.ts` | Only `blog-mirotech-sync.ts`, `blog-mirotech-sync-types.ts`, and test mock. Scripts already imported `journal-ingest` directly (`scripts/resync-mirotech-journal.ts`). |
| `apiLog` | Exactly 6 call sites (cron ×2, projects API, automation events, engagement, AI ops). No external package consumers. |
| `platformFeatures` | Zero production imports; only `lib/platform/index.ts` re-export and one test assertion. |

**Not removed:** `legacySyncBlogPostsMirotech`, handoff, upload dual-path branches, Prisma CMS, gallery delivery.

---

## 4. Files affected

**Deleted (2):**

- `lib/dual-brand/sync-journal.ts`
- `lib/observability/log.ts`

**Modified (14):**

- `lib/platform/publishing/integrations/blog-mirotech-sync.ts`
- `lib/platform/publishing/integrations/blog-mirotech-sync-types.ts`
- `lib/platform/publishing/integrations/blog-mirotech-sync.test.ts`
- `lib/platform/content/content-service.ts` (comment)
- `lib/platform/publishing/publishing-service.ts` (comment)
- `lib/platform/publishing/default-publishing-service.ts` (comment)
- `app/api/cron/platform-jobs/route.ts`
- `app/api/cron/followups/route.ts`
- `app/api/projects/route.ts`
- `app/api/studio/automation/events/route.ts`
- `lib/engagement/recordEvent.ts`
- `lib/ai/ops/orchestrator.ts`
- `lib/platform/features.ts`
- `lib/platform/index.ts`
- `lib/platform/features.test.ts`
- `docs/architecture/legacy-retirement-plan.md`

---

## 5. Tests

- `npm test` — full Vitest suite (512 tests)
- Targeted: `blog-mirotech-sync.test.ts`, `features.test.ts`

---

## 6. Build validation

- `npx tsc --noEmit`
- `npm run lint` (if configured)
- `npm run build`

Post-delete symbol grep: `sync-journal`, `apiLog`, `platformFeatures` — no remaining `.ts`/`.tsx` imports.

---

## 7. Rollback

**Git:** Revert the Phase 11B commit on `architecture/platform-foundation`, or cherry-pick inverse:

```bash
git revert <phase-11b-commit-sha>
```

**Per-item restore:**

| Item | Restore |
| --- | --- |
| sync-journal shim | Restore file from parent commit; revert import paths in 3 integration files |
| apiLog | Restore `lib/observability/log.ts`; revert 6 caller files |
| platformFeatures | Re-add alias block in `features.ts` + barrel export |

No database migration required. No env var changes.

---

## 8. Remaining legacy code (next batches)

**Phase 11C candidates (type-only, class D):**

- `@deprecated PlatformContentRef` in `content/types.ts`
- `PlatformAssetRef` / `PlatformSignedUrlOptions` in `services/types.ts`

**Blocked until prod flag evidence (class B→D):**

- Dual-path legacy branches in six upload/sign routes (`PLATFORM_MEDIA_ENABLED`)
- `legacySyncBlogPostsMirotech` / `legacyPatch*` (`PLATFORM_PUBLISHING_ENABLED`)
- Handoff (`LEGACY_ADMIN_HANDOFF_ENABLED`)

**Must stay (class A):** `storage-r2`, admin R2 manager, Prisma CMS writes, `journal-ingest`, `hub-remote-write`, session auth, client delivery.

See `docs/architecture/legacy-retirement-plan.md` for full inventory.
