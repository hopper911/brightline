import "server-only";

import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import type { MediaService } from "@/lib/platform/media/media-service";

export type GalleryAssetSignResult = {
  url: string;
  expiresIn: number;
};

export type SignGalleryAssetViaMediaServiceInput = {
  objectKey: string;
  expiresInSeconds?: number;
};

const DEFAULT_GALLERY_ASSET_EXPIRES_SECONDS = 3600;

/**
 * Phase 3E-1 — presigned GET for private gallery assets (admin gallery detail).
 * Keys remain under client-galleries/ unchanged; brightline vault only.
 */
export async function signGalleryAssetViaMediaService(
  service: MediaService,
  input: SignGalleryAssetViaMediaServiceInput
): Promise<GalleryAssetSignResult> {
  const context = createPlatformContextForTenant("brightline");
  const expiresInSeconds = input.expiresInSeconds ?? DEFAULT_GALLERY_ASSET_EXPIRES_SECONDS;
  const signed = await service.createDownloadUrl(
    context,
    { vault: "brightline", objectKey: input.objectKey },
    { expiresInSeconds }
  );
  return {
    url: signed.url,
    expiresIn: signed.expiresInSeconds,
  };
}
