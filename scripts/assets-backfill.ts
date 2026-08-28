/**
 * Controlled asset registry backfill (Phase 4B).
 *
 * Usage:
 *   npm run assets:backfill -- --source=brightline-portfolio --dry-run --limit=25
 *
 * Does NOT move, rename, or delete R2 objects.
 * Register mode does not change domain rows; --link-domain sets optional assetId only.
 */
import "./load-cli-env";

function logDatabaseTarget(): void {
  const host = (() => {
    try {
      const url = process.env.DATABASE_URL?.trim();
      if (!url) return "(DATABASE_URL unset)";
      return new URL(url).host;
    } catch {
      return "(invalid DATABASE_URL)";
    }
  })();
  const env =
    process.env.BRIGHTLINE_ENV === "production" ? "production" : "development";
  console.log(`[assets:backfill] database=${host} env=${env}`);
}

async function main() {
  logDatabaseTarget();
  const {
    formatBackfillReport,
    runAssetBackfill,
  } = await import("@/lib/platform/assets/backfill/run-backfill");
  const { parseAssetBackfillCliArgs, printAssetBackfillUsage } = await import(
    "@/lib/platform/assets/backfill/parse-cli-args"
  );

  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printAssetBackfillUsage();
    return;
  }

  const options = parseAssetBackfillCliArgs(argv);
  const report = await runAssetBackfill(options);
  if (!options.linkDomain) {
    console.log(formatBackfillReport(report));
  }

  const { prisma } = await import("@/lib/prisma");
  await prisma.$disconnect();

  if (report.errors > 0 || report.missingStorage > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
