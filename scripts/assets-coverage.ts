/**
 * PortfolioImage assetId coverage report (Phase 4D step 1).
 *
 * Usage:
 *   npm run assets:coverage
 *   npm run assets:coverage:prod
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
  console.log(`[assets:coverage] database=${host} env=${env}`);
}

async function main() {
  logDatabaseTarget();
  const { analyzePortfolioImageAssetCoverage, formatPortfolioImageCoverageReport } =
    await import("@/lib/platform/assets/coverage/portfolio-image-coverage");
  const report = await analyzePortfolioImageAssetCoverage();
  console.log(formatPortfolioImageCoverageReport(report));

  const { prisma } = await import("@/lib/prisma");
  await prisma.$disconnect();

  if (report.invalidAssetReferences > 0 || report.conflicts > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
