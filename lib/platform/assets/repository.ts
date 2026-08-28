import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  PlatformAssetRecord,
  PlatformAssetStorageRef,
  PlatformAssetVisibility,
  PlatformStorageProvider,
} from "@/lib/platform/assets/types";
import type { MediaStorageVault } from "@/lib/platform/media/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";

export type UpsertPlatformAssetInput = {
  tenantId: string;
  tenantSlug: TenantSlug;
  provider: PlatformStorageProvider;
  vault: MediaStorageVault;
  bucket: string;
  objectKey: string;
  filename?: string | null;
  mimeType?: string | null;
  visibility: PlatformAssetVisibility;
  metadata?: Record<string, unknown> | null;
};

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

const assetInclude = { tenant: { select: { slug: true } } } as const;

export async function findPlatformAssetById(
  id: string,
  client: PrismaClient = prisma
): Promise<PlatformAssetRecord | null> {
  const row = await client.platformAsset.findUnique({
    where: { id },
    include: assetInclude,
  });
  if (!row) return null;
  return mapRow(row);
}

export async function findPlatformAssetByStorageRef(
  ref: PlatformAssetStorageRef,
  client: PrismaClient = prisma
): Promise<PlatformAssetRecord | null> {
  const row = await client.platformAsset.findUnique({
    where: {
      provider_bucket_objectKey: {
        provider: ref.provider,
        bucket: ref.bucket,
        objectKey: ref.objectKey,
      },
    },
    include: assetInclude,
  });
  if (!row) return null;
  return mapRow(row);
}

export async function createPlatformAsset(
  input: UpsertPlatformAssetInput,
  client: PrismaClient = prisma
): Promise<PlatformAssetRecord> {
  const row = await client.platformAsset.create({
    data: {
      tenantId: input.tenantId,
      provider: input.provider,
      vault: input.vault,
      bucket: input.bucket,
      objectKey: input.objectKey,
      filename: input.filename ?? null,
      mimeType: input.mimeType ?? null,
      visibility: input.visibility,
      metadata: input.metadata ?? undefined,
    },
    include: assetInclude,
  });
  return mapRow(row);
}

/** Idempotent registry write for a physical storage object. */
export async function upsertPlatformAssetFromStorageRef(
  input: UpsertPlatformAssetInput,
  client: PrismaClient = prisma
): Promise<{ asset: PlatformAssetRecord; created: boolean }> {
  const existing = await findPlatformAssetByStorageRef(
    {
      provider: input.provider,
      bucket: input.bucket,
      objectKey: input.objectKey,
    },
    client
  );
  if (existing) {
    const row = await client.platformAsset.update({
      where: { id: existing.id },
      data: {
        filename: input.filename ?? existing.filename,
        mimeType: input.mimeType ?? existing.mimeType,
        visibility: input.visibility,
        metadata: input.metadata ?? undefined,
      },
      include: assetInclude,
    });
    return { asset: mapRow(row), created: false };
  }

  const asset = await createPlatformAsset(input, client);
  return { asset, created: true };
}
