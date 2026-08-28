import { Prisma, type PrismaClient } from "@prisma/client";
import { tableHasColumn } from "@/lib/platform/assets/backfill/db/table-has-column";
import {
  fetchPublishedPortfolioImages,
  type BrightlinePortfolioBackfillQuery,
} from "@/lib/platform/assets/backfill/sources/brightline-portfolio-queries";
import { resolveStorageReferenceFromStoredValue } from "@/lib/platform/assets/backfill/resolve-candidate-key";
import type { AssetBackfillRunOptions } from "@/lib/platform/assets/backfill/types";
import { findPlatformAssetByStorageRef } from "@/lib/platform/assets/repository";
import { getR2VaultCredentials } from "@/lib/r2-vaults";

export type DomainAssetLinkReport = {
  source: AssetBackfillRunOptions["source"];
  dryRun: boolean;
  linkDomain: true;
  examined: number;
  linked: number;
  wouldLink: number;
  alreadyLinked: number;
  noAssetMatch: number;
  invalidReference: number;
  domainConflicts: number;
  skipped: number;
  errors: number;
  failures: Array<{ recordId: string; recordType: string; reason: string; message: string }>;
};

export function createEmptyDomainLinkReport(
  source: AssetBackfillRunOptions["source"],
  dryRun: boolean
): DomainAssetLinkReport {
  return {
    source,
    dryRun,
    linkDomain: true,
    examined: 0,
    linked: 0,
    wouldLink: 0,
    alreadyLinked: 0,
    noAssetMatch: 0,
    invalidReference: 0,
    domainConflicts: 0,
    skipped: 0,
    errors: 0,
    failures: [],
  };
}

function legacyStored(image: {
  storageKey: string | null;
  fullUrl: string | null;
  url: string;
}): string | null {
  return image.storageKey?.trim() || image.fullUrl?.trim() || image.url?.trim() || null;
}

/** Populate PortfolioImage.assetId from existing platform_assets rows (Phase 4C). */
export async function runBrightlinePortfolioImageAssetLink(
  options: AssetBackfillRunOptions,
  client: PrismaClient
): Promise<DomainAssetLinkReport> {
  const report = createEmptyDomainLinkReport(options.source, options.dryRun);

  const hasAssetId = await tableHasColumn(client, "PortfolioImage", "assetId");
  if (!hasAssetId) {
    report.errors += 1;
    report.failures.push({
      recordId: "*",
      recordType: "schema",
      reason: "error",
      message:
        "Column PortfolioImage.assetId missing on this database. Run npm run db:migrate on the same DATABASE_URL, or use BRIGHTLINE_ENV=production if migrate targeted production.",
    });
    return report;
  }

  const images = await fetchPublishedPortfolioImagesForLink(client, {
    limit: options.limit,
    cursor: options.cursor,
    recordId: options.recordId,
  });

  let bucket: string;
  try {
    bucket = getR2VaultCredentials("brightline").bucket;
  } catch (error) {
    report.errors += 1;
    report.failures.push({
      recordId: "*",
      recordType: "config",
      reason: "error",
      message: error instanceof Error ? error.message : "Bucket resolution failed.",
    });
    return report;
  }

  for (const image of images) {
    report.examined += 1;

    if (image.assetId?.trim()) {
      const stored = legacyStored(image);
      const resolved = stored
        ? resolveStorageReferenceFromStoredValue(stored, {
            expectVault: "brightline",
            publishedPublic: false,
          })
        : null;

      if (resolved?.ok) {
        const existingAsset = await findPlatformAssetByIdSafe(client, image.assetId);
        if (
          existingAsset &&
          (existingAsset.objectKey !== resolved.objectKey ||
            existingAsset.vault !== resolved.vault)
        ) {
          report.domainConflicts += 1;
          report.failures.push({
            recordId: image.id,
            recordType: "PortfolioImage",
            reason: "domainConflict",
            message: `assetId ${image.assetId} points to ${existingAsset.objectKey}, legacy is ${resolved.objectKey}.`,
          });
          report.skipped += 1;
          continue;
        }
      }

      report.alreadyLinked += 1;
      continue;
    }

    const stored = legacyStored(image);
    const resolved = resolveStorageReferenceFromStoredValue(stored, {
      expectVault: "brightline",
      publishedPublic: false,
    });
    if (!resolved.ok) {
      report.invalidReference += 1;
      report.failures.push({
        recordId: image.id,
        recordType: "PortfolioImage",
        reason: "invalidReference",
        message: resolved.message,
      });
      report.skipped += 1;
      continue;
    }

    const asset = await findPlatformAssetByStorageRef(
      {
        provider: "R2",
        bucket,
        objectKey: resolved.objectKey,
      },
      client
    );

    if (!asset) {
      report.noAssetMatch += 1;
      report.skipped += 1;
      continue;
    }

    if (options.dryRun) {
      report.wouldLink += 1;
      continue;
    }

    try {
      await client.portfolioImage.update({
        where: { id: image.id },
        data: { assetId: asset.id },
      });
      report.linked += 1;
    } catch (error) {
      report.errors += 1;
      report.failures.push({
        recordId: image.id,
        recordType: "PortfolioImage",
        reason: "error",
        message: error instanceof Error ? error.message : "Link update failed.",
      });
      report.skipped += 1;
    }
  }

  return report;
}

type PortfolioImageLinkRow = {
  id: string;
  url: string;
  thumbUrl: string | null;
  fullUrl: string | null;
  storageKey: string | null;
  assetId: string | null;
};

async function findPlatformAssetByIdSafe(
  client: PrismaClient,
  assetId: string
): Promise<{ objectKey: string; vault: string } | null> {
  const row = await client.platformAsset.findUnique({
    where: { id: assetId },
    select: { objectKey: true, vault: true },
  });
  return row;
}

async function fetchPublishedPortfolioImagesForLink(
  client: PrismaClient,
  query: BrightlinePortfolioBackfillQuery
): Promise<PortfolioImageLinkRow[]> {
  const hasStorageKey = await tableHasColumn(client, "PortfolioImage", "storageKey");
  const parts: Prisma.Sql[] = [Prisma.sql`pp.published = true`];
  if (query.cursor) parts.push(Prisma.sql`pi.id > ${query.cursor}`);
  if (query.recordId) {
    parts.push(
      Prisma.sql`(pi.id = ${query.recordId} OR pi."projectId" = ${query.recordId})`
    );
  }
  const where = Prisma.join(parts, " AND ");

  if (hasStorageKey) {
    if (query.limit != null) {
      return client.$queryRaw<PortfolioImageLinkRow[]>`
        SELECT pi.id, pi.url, pi."thumbUrl", pi."fullUrl", pi."storageKey", pi."assetId"
        FROM "PortfolioImage" pi
        INNER JOIN "PortfolioProject" pp ON pp.id = pi."projectId"
        WHERE ${where}
        ORDER BY pi.id ASC
        LIMIT ${query.limit}
      `;
    }
    return client.$queryRaw<PortfolioImageLinkRow[]>`
      SELECT pi.id, pi.url, pi."thumbUrl", pi."fullUrl", pi."storageKey", pi."assetId"
      FROM "PortfolioImage" pi
      INNER JOIN "PortfolioProject" pp ON pp.id = pi."projectId"
      WHERE ${where}
      ORDER BY pi.id ASC
    `;
  }

  if (query.limit != null) {
    return client.$queryRaw<PortfolioImageLinkRow[]>`
      SELECT pi.id, pi.url, pi."thumbUrl", pi."fullUrl", NULL::text AS "storageKey", pi."assetId"
      FROM "PortfolioImage" pi
      INNER JOIN "PortfolioProject" pp ON pp.id = pi."projectId"
      WHERE ${where}
      ORDER BY pi.id ASC
      LIMIT ${query.limit}
    `;
  }
  return client.$queryRaw<PortfolioImageLinkRow[]>`
    SELECT pi.id, pi.url, pi."thumbUrl", pi."fullUrl", NULL::text AS "storageKey", pi."assetId"
    FROM "PortfolioImage" pi
    INNER JOIN "PortfolioProject" pp ON pp.id = pi."projectId"
    WHERE ${where}
    ORDER BY pi.id ASC
  `;
}

export function formatDomainAssetLinkReport(report: DomainAssetLinkReport): string {
  const lines = [
    `Domain asset link (${report.source})${report.dryRun ? " [DRY RUN]" : ""}`,
    `  examined:         ${report.examined}`,
    `  linked:           ${report.linked}`,
    `  wouldLink:        ${report.wouldLink}`,
    `  alreadyLinked:    ${report.alreadyLinked}`,
    `  noAssetMatch:     ${report.noAssetMatch}`,
    `  invalidReference: ${report.invalidReference}`,
    `  domainConflicts:  ${report.domainConflicts}`,
    `  skipped:          ${report.skipped}`,
    `  errors:           ${report.errors}`,
  ];
  if (report.failures.length > 0) {
    lines.push("  failures:");
    for (const f of report.failures.slice(0, 25)) {
      lines.push(`    - ${f.recordType}:${f.recordId} (${f.reason}): ${f.message}`);
    }
  }
  return lines.join("\n");
}
