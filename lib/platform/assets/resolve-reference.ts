import type { PlatformAssetRecord } from "@/lib/platform/assets/types";
import {
  isMediaObjectRef,
  isMediaReferenceWithAssetId,
  type MediaReference,
} from "@/lib/platform/assets/types";
import type { MediaObjectRef } from "@/lib/platform/media/types";
import { assertValidMediaObjectKey } from "@/lib/platform/media/validate-object-key";

export class PlatformAssetNotFoundError extends Error {
  constructor(assetId: string) {
    super(`Platform asset not found: ${assetId}`);
    this.name = "PlatformAssetNotFoundError";
  }
}

/** Resolve transitional MediaReference to a storage object ref. */
export async function resolveMediaReferenceToObjectRef(
  reference: MediaReference,
  lookupAssetById: (assetId: string) => Promise<PlatformAssetRecord | null>
): Promise<MediaObjectRef> {
  if (isMediaObjectRef(reference)) {
    return {
      vault: reference.vault,
      objectKey: assertValidMediaObjectKey(reference.objectKey),
    };
  }

  if (isMediaReferenceWithAssetId(reference)) {
    const asset = await lookupAssetById(reference.assetId);
    if (!asset) throw new PlatformAssetNotFoundError(reference.assetId);
    return { vault: asset.vault, objectKey: asset.objectKey };
  }

  if (reference.assetId) {
    const asset = await lookupAssetById(reference.assetId);
    if (!asset) throw new PlatformAssetNotFoundError(reference.assetId);
    return { vault: asset.vault, objectKey: asset.objectKey };
  }

  return {
    vault: reference.object.vault,
    objectKey: assertValidMediaObjectKey(reference.object.objectKey),
  };
}
