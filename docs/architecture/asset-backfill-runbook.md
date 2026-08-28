# Asset Registry Backfill Runbook

**Phase:** 4B — controlled backfill  
**Status:** Operator guide  
**Related:** [ADR-005](./ADR-005-asset-registry.md), [media-current-state](./media-current-state.md)

## What this does

Registers **existing** R2 objects in `platform_assets` using **database-driven** references. It does **not**:

- move, rename, or delete R2 objects
- rewrite URLs or storage keys in domain tables
- require asset IDs for production reads
- scan entire buckets

Legacy storage keys remain authoritative until a later phase wires optional `assetId` FKs.

## Preconditions

- Phase 4A migration applied (`platform_assets` table exists)
- `platform_tenants` seeded (Brightline / Mirotech rows)
- Local or staging `DATABASE_URL` configured (see `scripts/load-cli-env.ts`)
- For `--verify-storage`: R2 credentials for the relevant vault in env

**Not required:** `PLATFORM_ASSET_REGISTRY_ENABLED` — backfill writes via repository directly.

## Supported sources

| Source | Domain data | Tenant | Visibility |
| --- | --- | --- | --- |
| `brightline-portfolio` | Published `PortfolioImage` + project covers | `brightline` | `PUBLIC` when key matches public prefix policy; otherwise `PRIVATE` |

## Command

From `brightline/`:

```bash
# Development database (.env.local / .env.development.local)
npm run assets:backfill -- --source=brightline-portfolio --dry-run --limit=25

# Production database — must match where you ran db:migrate
npm run assets:backfill:prod -- --source=brightline-portfolio --dry-run --limit=25
# or: BRIGHTLINE_ENV=production npm run assets:backfill -- ...
```

**Important:** `npm run db:migrate` loads `.env.production.local` and targets **production** Neon. For development schema:

```bash
npm run db:migrate:dev
```

Use `assets:backfill` (dev) or `assets:backfill:prod` (production) to match the database you migrated.

# Execute small batch (staging/dev only until approved for production)
npm run assets:backfill -- --source=brightline-portfolio --limit=25

# Optional R2 existence check (adds remote HEAD per candidate)
npm run assets:backfill -- --source=brightline-portfolio --dry-run --limit=25 --verify-storage

# Phase 4C: link PortfolioImage.assetId to existing registry rows (after register pass)
npm run assets:backfill -- --source=brightline-portfolio --link-domain --dry-run --limit=25
```

### Phase 4C domain link (`--link-domain`)

Run **after** a register pass created `platform_assets` rows:

1. `--link-domain --dry-run` — reports `wouldLink` / `noAssetMatch` / `domainConflicts`
2. `--link-domain` execute — sets `PortfolioImage.assetId` only; legacy `url`/`storageKey` untouched
3. Re-run — expect `alreadyLinked` only

Requires migration `20260828170000_portfolio_image_platform_asset`.

### Options

| Flag | Description |
| --- | --- |
| `--source=` | Required. See table above. |
| `--dry-run` | No registry writes. Also `DRY_RUN=1`. |
| `--limit=N` | Max domain rows to examine. Start small (25–100). |
| `--cursor=<id>` | Resume after a domain record id. |
| `--record-id=<id>` | Single `PortfolioImage` or `PortfolioProject` id. |
| `--verify-storage` | Skip candidates whose object is missing in R2. |

## Reading the report

```
examined            Domain rows read from DB
validReferences     Unique storage objects eligible for registry
wouldRegister       Dry-run: new rows that would be created
registered          Execute: new rows created
alreadyRegistered   Existing registry row reused
invalidReference    Could not derive a valid brightline vault key
missingStorage      R2 object missing (--verify-storage)
conflicts           Existing asset owned by a different tenant
errors              Unexpected failures (logged per record)
```

Failures list record ids — not signed URLs or secrets.

## Safe operator workflow

1. Apply migration on **staging** if not already applied.
2. Run **dry-run** with `--limit=25`. Review `invalidReference`, `conflicts`, and `wouldRegister`.
3. Optionally re-run with `--verify-storage` on the same limit.
4. Execute on **staging** with the same limit; confirm `registered + alreadyRegistered` matches expectations.
5. Re-run execute — expect `alreadyRegistered` only (idempotency check).
6. **Production:** only after human review of staging reports. Use small limits; pause if error rate is high.

## Rollback

- Registry rows are supplementary. Delete specific `platform_assets` rows or truncate the table.
- Domain tables and R2 objects are untouched by backfill.
- Set `PLATFORM_ASSET_REGISTRY_ENABLED=false` if runtime registration must stop (upload paths unaffected in 4B).

## Production safety checklist

- [ ] Dry-run reviewed
- [ ] Small `--limit` for first execute pass
- [ ] No domain record updates expected
- [ ] No R2 mutations expected
- [ ] Idempotent re-run verified on staging
- [ ] Private keys not registered as PUBLIC (check ambiguity failures)

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `PortfolioImage.storageKey does not exist` | Dev DB behind migrations — backfill uses schema-aware raw SQL; run `npm run db:migrate` to sync |
| `missingBucketConfig` | `R2_BUCKET` / vault creds missing in env |
| High `invalidReference` | Rows store page paths, external URLs, or empty keys |
| `conflicts` | Object already registered under another tenant (investigate before force) |
| `missingStorage` with verify | DB references object deleted from R2 — skip or repair domain row separately |

## Adding a new source (future)

1. Add collector under `lib/platform/assets/backfill/sources/`.
2. Register in `collect-candidates.ts` and `ASSET_BACKFILL_SOURCES`.
3. Document tenant + visibility rules in this runbook.
4. Ship tests + dry-run on staging before production.
