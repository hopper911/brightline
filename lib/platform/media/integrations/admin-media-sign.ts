import "server-only";

import { isPublicMediaKey } from "@/lib/media-key-access";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import type { MediaService } from "@/lib/platform/media/media-service";
import { signPublicR2Get } from "@/lib/storage-r2-public";

const ADMIN_MEDIA_SIGN_EXPIRES_SECONDS = 300;

/** Phase 3D — admin preview redirect URL (presigned GET, 300s). */
export async function createAdminMediaSignRedirectUrl(
  service: MediaService,
  objectKey: string
): Promise<string> {
  if (isPublicMediaKey(objectKey)) {
    const signed = await signPublicR2Get({
      key: objectKey,
      expiresIn: ADMIN_MEDIA_SIGN_EXPIRES_SECONDS,
    });
    return signed.url;
  }

  const context = createPlatformContextForTenant("brightline");
  const signed = await service.createDownloadUrl(
    context,
    { vault: "brightline", objectKey },
    { expiresInSeconds: ADMIN_MEDIA_SIGN_EXPIRES_SECONDS }
  );
  return signed.url;
}
