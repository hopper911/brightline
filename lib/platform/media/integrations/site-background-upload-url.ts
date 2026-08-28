import "server-only";

import type { MediaService } from "@/lib/platform/media/media-service";
import type { SiteBackgroundUploadUrlSuccess } from "@/lib/site-background-upload-url";
import { createBrightlineUploadViaMediaService } from "@/lib/platform/media/integrations/brightline-upload";

export type SiteBackgroundUploadUrlViaMediaServiceInput = {
  objectKey: string;
  contentType: string;
};

/** Phase 3D — platform media path for site-background upload URL generation. */
export async function createSiteBackgroundUploadUrlViaMediaService(
  service: MediaService,
  input: SiteBackgroundUploadUrlViaMediaServiceInput
): Promise<SiteBackgroundUploadUrlSuccess> {
  const signed = await createBrightlineUploadViaMediaService(service, {
    objectKey: input.objectKey,
    contentType: input.contentType,
    visibility: "private",
  });

  return {
    ok: true,
    key: input.objectKey,
    uploadUrl: signed.uploadUrl,
    headers: { ...(signed.headers ?? {}) },
    expiresIn: signed.expiresInSeconds,
  };
}
