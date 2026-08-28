import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AssetBackfillCollectionResult } from "@/lib/platform/assets/backfill/types";
import { inferMimeTypeFromFilename } from "@/lib/platform/assets/backfill/infer-mime";
import { resolveStorageReferenceFromStoredValue } from "@/lib/platform/assets/backfill/resolve-candidate-key";

export type BrightlinePortfolioBackfillQuery = {
  limit?: number;
  cursor?: string;
  recordId?: string;
};

const SOURCE = "brightline-portfolio" as const;

function tryPushCandidate(
  result: AssetBackfillCollectionResult,
  seenKeys: Set<string>,
  input: {
    recordId: string;
    recordType: string;
    field: string;
    stored: string | null | undefined;
    projectId: string;
    projectSlug: string;
  }
): void {
  const resolved = resolveStorageReferenceFromStoredValue(input.stored, {
    expectVault: "brightline",
    publishedPublic: true,
  });
  if (!resolved.ok) {
    result.invalidReferences.push({
      recordId: input.recordId,
      recordType: input.recordType,
      message: `${input.field}: ${resolved.message}`,
    });
    return;
  }

  const dedupe = `${resolved.vault}:${resolved.objectKey}`;
  if (seenKeys.has(dedupe)) return;
  seenKeys.add(dedupe);

  result.candidates.push({
    source: SOURCE,
    recordId: input.recordId,
    recordType: input.recordType,
    objectKey: resolved.objectKey,
    vault: resolved.vault,
    tenantSlug: "brightline",
    visibility: resolved.visibility,
    filename: resolved.filename,
    mimeType: inferMimeTypeFromFilename(resolved.filename),
    visibilityAmbiguous: resolved.visibilityAmbiguous,
    metadata: {
      backfillSource: SOURCE,
      sourceRecordId: input.recordId,
      sourceRecordType: input.recordType,
      field: input.field,
      projectId: input.projectId,
      projectSlug: input.projectSlug,
    },
  });
}

/** Database-driven candidates from published legacy portfolio rows. */
export async function collectBrightlinePortfolioCandidates(
  query: BrightlinePortfolioBackfillQuery,
  client: PrismaClient = prisma
): Promise<AssetBackfillCollectionResult> {
  const result: AssetBackfillCollectionResult = {
    rowsExamined: 0,
    candidates: [],
    invalidReferences: [],
  };
  const seenKeys = new Set<string>();

  const imageWhere = {
    project: { published: true },
    ...(query.recordId
      ? { OR: [{ id: query.recordId }, { projectId: query.recordId }] }
      : {}),
    ...(query.cursor ? { id: { gt: query.cursor } } : {}),
  };

  const images = await client.portfolioImage.findMany({
    where: imageWhere,
    orderBy: { id: "asc" },
    take: query.limit,
    include: {
      project: { select: { id: true, slug: true, published: true } },
    },
  });

  for (const image of images) {
    result.rowsExamined += 1;
    tryPushCandidate(result, seenKeys, {
      recordId: image.id,
      recordType: "PortfolioImage",
      field: "storageKey",
      stored: image.storageKey ?? image.fullUrl ?? image.url,
      projectId: image.project.id,
      projectSlug: image.project.slug,
    });
  }

  if (query.limit && images.length >= query.limit) {
    return result;
  }

  const remaining =
    query.limit !== undefined ? Math.max(0, query.limit - images.length) : undefined;
  if (remaining === 0) return result;

  const coverWhere = {
    published: true,
    OR: [{ coverStorageKey: { not: null } }, { coverUrl: { not: null } }],
    ...(query.recordId ? { id: query.recordId } : {}),
    ...(query.cursor ? { id: { gt: query.cursor } } : {}),
  };

  const projects = await client.portfolioProject.findMany({
    where: coverWhere,
    orderBy: { id: "asc" },
    take: remaining,
    select: { id: true, slug: true, coverStorageKey: true, coverUrl: true },
  });

  for (const project of projects) {
    result.rowsExamined += 1;
    tryPushCandidate(result, seenKeys, {
      recordId: project.id,
      recordType: "PortfolioProject",
      field: "coverStorageKey",
      stored: project.coverStorageKey ?? project.coverUrl,
      projectId: project.id,
      projectSlug: project.slug,
    });
  }

  return result;
}
