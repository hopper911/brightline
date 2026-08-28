import {
  ASSET_BACKFILL_SOURCES,
  isAssetBackfillSource,
  type AssetBackfillRunOptions,
} from "@/lib/platform/assets/backfill/types";

export type ParsedAssetBackfillCli = AssetBackfillRunOptions;

function readFlagValue(argv: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  for (const arg of argv) {
    if (arg.startsWith(prefix)) return arg.slice(prefix.length).trim() || undefined;
  }
  return undefined;
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(`--${name}`);
}

export function parseAssetBackfillCliArgs(argv: string[]): ParsedAssetBackfillCli {
  const sourceRaw = readFlagValue(argv, "source");
  if (!sourceRaw) {
    throw new Error(
      `--source is required. Supported: ${ASSET_BACKFILL_SOURCES.join(", ")}`
    );
  }
  if (!isAssetBackfillSource(sourceRaw)) {
    throw new Error(
      `Unknown source "${sourceRaw}". Supported: ${ASSET_BACKFILL_SOURCES.join(", ")}`
    );
  }

  const limitRaw = readFlagValue(argv, "limit");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
  if (limitRaw && (!Number.isFinite(limit) || (limit ?? 0) <= 0)) {
    throw new Error("--limit must be a positive integer.");
  }

  const dryRun =
    hasFlag(argv, "dry-run") ||
    process.env.DRY_RUN === "1" ||
    process.env.DRY_RUN === "true";

  return {
    source: sourceRaw,
    dryRun,
    limit,
    cursor: readFlagValue(argv, "cursor"),
    recordId: readFlagValue(argv, "record-id"),
    verifyStorage: hasFlag(argv, "verify-storage"),
  };
}

export function printAssetBackfillUsage(): void {
  console.log(`Usage:
  npm run assets:backfill -- --source=<source> [options]

Sources:
  brightline-portfolio   Published PortfolioImage / cover keys (Brightline tenant)

Options:
  --dry-run              Report only; no registry writes (also DRY_RUN=1)
  --limit=N              Max domain records to examine (default: all eligible)
  --cursor=<id>          Resume after domain record id
  --record-id=<id>       Restrict to one PortfolioImage or PortfolioProject id
  --verify-storage       HEAD each object in R2 before registering (optional)

Examples:
  npm run assets:backfill -- --source=brightline-portfolio --dry-run --limit=25
  npm run assets:backfill -- --source=brightline-portfolio --limit=25 --verify-storage
`);
}
