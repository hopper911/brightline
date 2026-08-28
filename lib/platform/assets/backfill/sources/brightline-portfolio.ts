import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AssetBackfillCollectionResult } from "@/lib/platform/assets/backfill/types";
import { inferMimeTypeFromFilename } from "@/lib/platform/assets/backfill/infer-mime";
import { resolveStorageReferenceFromStoredValue } from "@/lib/platform/assets/backfill/resolve-candidate-key";
import {
  fetchPublishedPortfolioCovers,
  fetchPublishedPortfolioImages,
  type BrightlinePortfolioBackfillQuery,
} from "@/lib/platform/assets/backfill/sources/brightline-portfolio-queries";

export type { BrightlinePortfolioBackfillQuery };

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

function storedFieldForImage(image: {
  storageKey: string | null;
  fullUrl: string | null;
  url: string;
}): { field: string; stored: string | null | undefined } {
  if (image.storageKey?.trim()) {
    return { field: "storageKey", stored: image.storageKey };
  }
  if (image.fullUrl?.trim()) {
    return { field: "fullUrl", stored: image.fullUrl };
  }
  return { field: "url", stored: image.url };
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

  const images = await fetchPublishedPortfolioImages(client, query);

  for (const image of images) {
    result.rowsExamined += 1;
    const { field, stored } = storedFieldForImage(image);
    tryPushCandidate(result, seenKeys, {
      recordId: image.id,
      recordType: "PortfolioImage",
      field,
      stored,
      projectId: image.projectId,
      projectSlug: image.projectSlug,
    });
  }

  if (query.limit && images.length >= query.limit) {
    return result;
  }

  const remaining =
    query.limit !== undefined ? Math.max(0, query.limit - images.length) : undefined;
  if (remaining === 0) return result;

  const projects = await fetchPublishedPortfolioCovers(client, query, remaining);

  for (const project of projects) {
    result.rowsExamined += 1;
    const field = project.coverStorageKey?.trim() ? "coverStorageKey" : "coverUrl";
    tryPushCandidate(result, seenKeys, {
      recordId: project.id,
      recordType: "PortfolioProject",
      field,
      stored: project.coverStorageKey ?? project.coverUrl,
      projectId: project.id,
      projectSlug: project.slug,
    });
  }

  return result;
}
