import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { tableHasColumn } from "@/lib/platform/assets/backfill/db/table-has-column";
import { resolveStorageReferenceFromStoredValue } from "@/lib/platform/assets/backfill/resolve-candidate-key";
import { portfolioImageLegacyReference } from "@/lib/platform/assets/resolve-domain-media";
import { findPlatformAssetsByIds } from "@/lib/platform/assets/repository-batch";

export type PortfolioImageCoverageReport = {
  domain: "PortfolioImage";
  total: number;
  withAssetId: number;
  withoutAssetId: number;
  linkedPercent: number;
  conflicts: number;
  invalidAssetReferences: number;
  missingLegacyReference: number;
  publishedTotal: number;
  publishedWithAssetId: number;
  publishedLinkedPercent: number;
};

type ImageRow = {
  id: string;
  assetId: string | null;
  url: string;
  storageKey: string | null;
  fullUrl: string | null;
  published: boolean;
};

async function fetchAllPortfolioImageRows(
  client: PrismaClient,
  hasAssetId: boolean,
  hasStorageKey: boolean
): Promise<ImageRow[]> {
  if (hasAssetId && hasStorageKey) {
    return client.$queryRaw<ImageRow[]>`
      SELECT pi.id, pi."assetId", pi.url, pi."storageKey", pi."fullUrl", pp.published
      FROM "PortfolioImage" pi
      INNER JOIN "PortfolioProject" pp ON pp.id = pi."projectId"
    `;
  }
  if (hasAssetId) {
    return client.$queryRaw<ImageRow[]>`
      SELECT pi.id, pi."assetId", pi.url, NULL::text AS "storageKey", pi."fullUrl", pp.published
      FROM "PortfolioImage" pi
      INNER JOIN "PortfolioProject" pp ON pp.id = pi."projectId"
    `;
  }
  if (hasStorageKey) {
    return client.$queryRaw<ImageRow[]>`
      SELECT pi.id, NULL::text AS "assetId", pi.url, pi."storageKey", pi."fullUrl", pp.published
      FROM "PortfolioImage" pi
      INNER JOIN "PortfolioProject" pp ON pp.id = pi."projectId"
    `;
  }
  return client.$queryRaw<ImageRow[]>`
    SELECT pi.id, NULL::text AS "assetId", pi.url, NULL::text AS "storageKey", pi."fullUrl", pp.published
    FROM "PortfolioImage" pi
    INNER JOIN "PortfolioProject" pp ON pp.id = pi."projectId"
  `;
}

/** Pre-cutover coverage for PortfolioImage assetId linkage (Phase 4D step 1). */
export async function analyzePortfolioImageAssetCoverage(
  client: PrismaClient = prisma
): Promise<PortfolioImageCoverageReport> {
  const hasAssetId = await tableHasColumn(client, "PortfolioImage", "assetId");
  const hasStorageKey = await tableHasColumn(client, "PortfolioImage", "storageKey");
  const rows = await fetchAllPortfolioImageRows(client, hasAssetId, hasStorageKey);

  const assetIds = rows.map((r) => r.assetId?.trim()).filter((id): id is string => Boolean(id));
  const assetsById = await findPlatformAssetsByIds(assetIds, client);

  let withAssetId = 0;
  let conflicts = 0;
  let invalidAssetReferences = 0;
  let missingLegacyReference = 0;
  let publishedTotal = 0;
  let publishedWithAssetId = 0;

  for (const row of rows) {
    if (row.published) publishedTotal += 1;

    const legacy = portfolioImageLegacyReference(row);
    if (!legacy) missingLegacyReference += 1;

    const assetId = row.assetId?.trim() || null;
    if (!assetId) continue;

    withAssetId += 1;
    if (row.published) publishedWithAssetId += 1;

    const asset = assetsById.get(assetId);
    if (!asset) {
      invalidAssetReferences += 1;
      continue;
    }

    if (legacy) {
      const resolved = resolveStorageReferenceFromStoredValue(legacy, {
        expectVault: "brightline",
        publishedPublic: false,
      });
      if (
        resolved.ok &&
        (resolved.objectKey !== asset.objectKey || resolved.vault !== asset.vault)
      ) {
        conflicts += 1;
      }
    }
  }

  const total = rows.length;
  const withoutAssetId = total - withAssetId;
  const linkedPercent = total > 0 ? Math.round((withAssetId / total) * 1000) / 10 : 0;
  const publishedLinkedPercent =
    publishedTotal > 0 ? Math.round((publishedWithAssetId / publishedTotal) * 1000) / 10 : 0;

  return {
    domain: "PortfolioImage",
    total,
    withAssetId,
    withoutAssetId,
    linkedPercent,
    conflicts,
    invalidAssetReferences,
    missingLegacyReference,
    publishedTotal,
    publishedWithAssetId,
    publishedLinkedPercent,
  };
}

export function formatPortfolioImageCoverageReport(report: PortfolioImageCoverageReport): string {
  return [
    `PortfolioImage asset coverage`,
    `  total:                  ${report.total}`,
    `  withAssetId:            ${report.withAssetId} (${report.linkedPercent}%)`,
    `  withoutAssetId:         ${report.withoutAssetId}`,
    `  publishedTotal:         ${report.publishedTotal}`,
    `  publishedWithAssetId:   ${report.publishedWithAssetId} (${report.publishedLinkedPercent}%)`,
    `  conflicts:              ${report.conflicts}`,
    `  invalidAssetReferences: ${report.invalidAssetReferences}`,
    `  missingLegacyReference: ${report.missingLegacyReference}`,
  ].join("\n");
}
