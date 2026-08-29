/**
 * Resolve and validate platform asset references for project import.
 * Rejects arbitrary R2 keys from untrusted import payloads.
 */

import "server-only";

import { MediaKind } from "@prisma/client";
import { getStudioAssetDetail } from "@/lib/studio/media/list-studio-assets";
import type { TenantSlug } from "@/lib/platform/tenants/types";
import { prisma } from "@/lib/prisma";

export type ResolvedImportAsset = {
  assetId: string;
  objectKey: string;
};

export type ImportAssetResolution = {
  resolved: ResolvedImportAsset | null;
  warning: string | null;
  error: string | null;
};

export async function resolveImportPlatformAsset(
  tenant: TenantSlug,
  assetId: string | undefined
): Promise<ImportAssetResolution> {
  const id = assetId?.trim();
  if (!id) {
    return { resolved: null, warning: null, error: null };
  }

  const asset = await getStudioAssetDetail(tenant, id);
  if (!asset) {
    return {
      resolved: null,
      warning: null,
      error: `Unknown or cross-tenant asset id "${id}".`,
    };
  }

  if (!asset.objectKey?.trim()) {
    return {
      resolved: null,
      warning: null,
      error: `Asset "${id}" has no object key.`,
    };
  }

  return {
    resolved: { assetId: asset.id, objectKey: asset.objectKey },
    warning: null,
    error: null,
  };
}

/** Brightline work projects use MediaAsset — find or create by registry object key. */
export async function resolveBrightlineHeroMediaId(
  tenant: TenantSlug,
  assetId: string | undefined
): Promise<ImportAssetResolution & { mediaId: string | null }> {
  const base = await resolveImportPlatformAsset(tenant, assetId);
  if (!base.resolved) {
    return { ...base, mediaId: null };
  }

  const key = base.resolved.objectKey;
  let media = await prisma.mediaAsset.findFirst({ where: { keyFull: key } });
  if (!media) {
    media = await prisma.mediaAsset.create({
      data: {
        kind: MediaKind.IMAGE,
        keyFull: key,
        keyThumb: key,
      },
    });
  }

  return {
    resolved: base.resolved,
    warning: base.warning,
    error: base.error,
    mediaId: media.id,
  };
}
