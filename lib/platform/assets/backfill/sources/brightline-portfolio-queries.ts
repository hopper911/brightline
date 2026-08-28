import { Prisma, type PrismaClient } from "@prisma/client";
import { tableHasColumn } from "@/lib/platform/assets/backfill/db/table-has-column";

export type BrightlinePortfolioBackfillQuery = {
  limit?: number;
  cursor?: string;
  recordId?: string;
};

export type PortfolioImageBackfillRow = {
  id: string;
  url: string;
  thumbUrl: string | null;
  fullUrl: string | null;
  storageKey: string | null;
  projectId: string;
  projectSlug: string;
};

export type PortfolioCoverBackfillRow = {
  id: string;
  slug: string;
  coverStorageKey: string | null;
  coverUrl: string | null;
};

function portfolioImageFilters(
  query: BrightlinePortfolioBackfillQuery,
  idColumn: Prisma.Sql
): Prisma.Sql {
  const parts: Prisma.Sql[] = [Prisma.sql`pp.published = true`];
  if (query.cursor) {
    parts.push(Prisma.sql`${idColumn} > ${query.cursor}`);
  }
  if (query.recordId) {
    parts.push(
      Prisma.sql`(pi.id = ${query.recordId} OR pi."projectId" = ${query.recordId})`
    );
  }
  return Prisma.join(parts, " AND ");
}

function portfolioProjectFilters(query: BrightlinePortfolioBackfillQuery): Prisma.Sql {
  const parts: Prisma.Sql[] = [Prisma.sql`pp.published = true`];
  if (query.cursor) {
    parts.push(Prisma.sql`pp.id > ${query.cursor}`);
  }
  if (query.recordId) {
    parts.push(Prisma.sql`pp.id = ${query.recordId}`);
  }
  return Prisma.join(parts, " AND ");
}

/** Raw SQL avoids Prisma selecting columns missing on drifted dev databases. */
export async function fetchPublishedPortfolioImages(
  client: PrismaClient,
  query: BrightlinePortfolioBackfillQuery
): Promise<PortfolioImageBackfillRow[]> {
  const hasStorageKey = await tableHasColumn(client, "PortfolioImage", "storageKey");
  const where = portfolioImageFilters(query, Prisma.sql`pi.id`);
  const limit = query.limit ?? null;

  if (hasStorageKey) {
    if (limit != null) {
      return client.$queryRaw<PortfolioImageBackfillRow[]>`
        SELECT
          pi.id,
          pi.url,
          pi."thumbUrl",
          pi."fullUrl",
          pi."storageKey",
          pp.id AS "projectId",
          pp.slug AS "projectSlug"
        FROM "PortfolioImage" pi
        INNER JOIN "PortfolioProject" pp ON pp.id = pi."projectId"
        WHERE ${where}
        ORDER BY pi.id ASC
        LIMIT ${limit}
      `;
    }
    return client.$queryRaw<PortfolioImageBackfillRow[]>`
      SELECT
        pi.id,
        pi.url,
        pi."thumbUrl",
        pi."fullUrl",
        pi."storageKey",
        pp.id AS "projectId",
        pp.slug AS "projectSlug"
      FROM "PortfolioImage" pi
      INNER JOIN "PortfolioProject" pp ON pp.id = pi."projectId"
      WHERE ${where}
      ORDER BY pi.id ASC
    `;
  }

  if (limit != null) {
    return client.$queryRaw<PortfolioImageBackfillRow[]>`
      SELECT
        pi.id,
        pi.url,
        pi."thumbUrl",
        pi."fullUrl",
        NULL::text AS "storageKey",
        pp.id AS "projectId",
        pp.slug AS "projectSlug"
      FROM "PortfolioImage" pi
      INNER JOIN "PortfolioProject" pp ON pp.id = pi."projectId"
      WHERE ${where}
      ORDER BY pi.id ASC
      LIMIT ${limit}
    `;
  }
  return client.$queryRaw<PortfolioImageBackfillRow[]>`
    SELECT
      pi.id,
      pi.url,
      pi."thumbUrl",
      pi."fullUrl",
      NULL::text AS "storageKey",
      pp.id AS "projectId",
      pp.slug AS "projectSlug"
    FROM "PortfolioImage" pi
    INNER JOIN "PortfolioProject" pp ON pp.id = pi."projectId"
    WHERE ${where}
    ORDER BY pi.id ASC
  `;
}

export async function fetchPublishedPortfolioCovers(
  client: PrismaClient,
  query: BrightlinePortfolioBackfillQuery,
  take?: number
): Promise<PortfolioCoverBackfillRow[]> {
  const hasCoverStorageKey = await tableHasColumn(client, "PortfolioProject", "coverStorageKey");
  const where = portfolioProjectFilters(query);

  const coverPredicates: Prisma.Sql[] = [Prisma.sql`pp."coverUrl" IS NOT NULL`];
  if (hasCoverStorageKey) {
    coverPredicates.unshift(Prisma.sql`pp."coverStorageKey" IS NOT NULL`);
  }
  const coverWhere = Prisma.join(
    [where, Prisma.sql`(${Prisma.join(coverPredicates, " OR ")})`],
    " AND "
  );

  if (hasCoverStorageKey) {
    if (take != null) {
      return client.$queryRaw<PortfolioCoverBackfillRow[]>`
        SELECT pp.id, pp.slug, pp."coverStorageKey", pp."coverUrl"
        FROM "PortfolioProject" pp
        WHERE ${coverWhere}
        ORDER BY pp.id ASC
        LIMIT ${take}
      `;
    }
    return client.$queryRaw<PortfolioCoverBackfillRow[]>`
      SELECT pp.id, pp.slug, pp."coverStorageKey", pp."coverUrl"
      FROM "PortfolioProject" pp
      WHERE ${coverWhere}
      ORDER BY pp.id ASC
    `;
  }

  if (take != null) {
    return client.$queryRaw<PortfolioCoverBackfillRow[]>`
      SELECT pp.id, pp.slug, NULL::text AS "coverStorageKey", pp."coverUrl"
      FROM "PortfolioProject" pp
      WHERE ${coverWhere}
      ORDER BY pp.id ASC
      LIMIT ${take}
    `;
  }
  return client.$queryRaw<PortfolioCoverBackfillRow[]>`
    SELECT pp.id, pp.slug, NULL::text AS "coverStorageKey", pp."coverUrl"
    FROM "PortfolioProject" pp
    WHERE ${coverWhere}
    ORDER BY pp.id ASC
  `;
}
