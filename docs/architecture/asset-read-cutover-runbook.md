# Asset Read Cutover Runbook (Phase 4D)

**Domain:** `PortfolioImage` (admin portfolio GET)  
**Flag:** `PLATFORM_ASSET_READ_ENABLED` (default **off**)

## Coverage gate (before enabling reads)

```bash
npm run assets:coverage:prod
```

Review:

| Metric | Action if high |
| --- | --- |
| `linkedPercent` / `publishedLinkedPercent` | Low → run register + link backfill first |
| `conflicts` | Fix domain rows before enabling reads |
| `invalidAssetReferences` | Re-link or clear bad `assetId` values |
| `missingLegacyReference` | Rows with only broken refs — fix manually |

Do not enable production reads if published linkage is unexpectedly low or conflicts are non-zero.

## Rollout sequence

1. **Deploy** with `PLATFORM_ASSET_READ_ENABLED=false` (no behavior change).
2. **Smoke test** admin `/api/admin/portfolio` GET — unchanged URLs.
3. **Staging/dev:** set `PLATFORM_ASSET_READ_ENABLED=true`.
4. **Verify** admin portfolio previews load; check logs for `[platform-asset-read]` metrics.
5. **Production:** enable flag **manually** in Vercel env after coverage + staging sign-off.
6. **Monitor** fallback rate (`assetFallbackLegacy`, `assetMissing`, `assetTenantMismatch`).
7. **Rollback:** set flag `false` immediately if previews break — legacy paths resume.

## What changes when flag is on

- `GET /api/admin/portfolio` resolves image `url` via:
  - `assetId` → registry → `MediaService.getAssetUrl`
  - legacy fallback on missing asset, tenant mismatch, or storage conflict
- `storageKey`, `assetId`, and DB rows are **not** modified on read.

## Observability (logs)

```
[platform-asset-read] assetReadSuccess
[platform-asset-read] assetFallbackLegacy
[platform-asset-read] assetMissing
[platform-asset-read] assetTenantMismatch
[platform-asset-read] portfolio admin batch {"assetReadSuccess":N,...}
```

## Rollback

Set `PLATFORM_ASSET_READ_ENABLED=false`. No migration rollback required.

## Next domain candidates

- Mirotech CMS project media (after link backfill)
- Public work/gallery surfaces (separate phase — client delivery stays legacy-first)
