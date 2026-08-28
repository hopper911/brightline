import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PlatformAssetRecord } from "@/lib/platform/assets/types";

const assetInclude = { tenant: { select: { slug: true } } } as const;

function mapRow(row: {
  id: string;
  tenantId: string;
  provider: string;
  vault: string;
  bucket: string;
  objectKey: string;
  filename: string | null;
  mimeType: string | null;
  visibility: string;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  tenant: { slug: string };
}): PlatformAssetRecord {
  const vault = row.vault === "mirotech-site" ? "mirotech-site" : "brightline";
  const tenantSlug = row.tenant.slug === "mirotech" ? "mirotech" : "brightline";
  return {
    id: row.id,
    tenantId: row.tenantId,
    tenantSlug,
    provider: "R2",
    vault,
    bucket: row.bucket,
    objectKey: row.objectKey,
    filename: row.filename,
    mimeType: row.mimeType,
    visibility: row.visibility === "PUBLIC" ? "PUBLIC" : "PRIVATE",
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Batch lookup for dual-write / link backfill (same bucket + provider). */
export async function findPlatformAssetsByObjectKeys(
  bucket: string,
  objectKeys: string[],
  client: PrismaClient = prisma
): Promise<Map<string, PlatformAssetRecord>> {
  const uniqueKeys = [...new Set(objectKeys.map((k) => k.trim()).filter(Boolean))];
  if (uniqueKeys.length === 0) return new Map();

  const rows = await client.platformAsset.findMany({
    where: {
      provider: "R2",
      bucket,
      objectKey: { in: uniqueKeys },
    },
    include: assetInclude,
  });

  const out = new Map<string, PlatformAssetRecord>();
  for (const row of rows) {
    out.set(row.objectKey, mapRow(row));
  }
  return out;
}

/** Batch lookup by platform asset id (Phase 4D list reads). */
export async function findPlatformAssetsByIds(
  assetIds: string[],
  client: PrismaClient = prisma
): Promise<Map<string, PlatformAssetRecord>> {
  const uniqueIds = [...new Set(assetIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const rows = await client.platformAsset.findMany({
    where: { id: { in: uniqueIds } },
    include: assetInclude,
  });

  const out = new Map<string, PlatformAssetRecord>();
  for (const row of rows) {
    out.set(row.id, mapRow(row));
  }
  return out;
}
