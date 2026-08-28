import "server-only";

import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import type { MediaService } from "@/lib/platform/media/media-service";

const MIROTECH_CMS_ADMIN_SIGN_EXPIRES_SECONDS = 900;

/** Phase 3F — admin R2 manager preview redirect for mirotech-site objects. */
export async function createMirotechCmsSignRedirectUrl(
  service: MediaService,
  objectKey: string,
  expiresInSeconds: number = MIROTECH_CMS_ADMIN_SIGN_EXPIRES_SECONDS
): Promise<string> {
  const context = createPlatformContextForTenant("mirotech");
  const signed = await service.createDownloadUrl(
    context,
    { vault: "mirotech-site", objectKey },
    { expiresInSeconds }
  );
  return signed.url;
}
