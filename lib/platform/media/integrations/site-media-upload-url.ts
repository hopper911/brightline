import "server-only";

import { getPublicR2Url } from "@/lib/r2";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import { isMediaError } from "@/lib/platform/media/errors";
import type { MediaService } from "@/lib/platform/media/media-service";
import type { SiteMediaUploadUrlSuccess } from "@/lib/site-media-upload-url";

export type SiteMediaUploadUrlViaMediaServiceInput = {
  objectKey: string;
  contentType: string;
};

/** Phase 3C — platform media path for admin CMS upload URL generation. */
export async function createSiteMediaUploadUrlViaMediaService(
  service: MediaService,
  input: SiteMediaUploadUrlViaMediaServiceInput
): Promise<SiteMediaUploadUrlSuccess> {
  const context = createPlatformContextForTenant("brightline");
  const signed = await service.createUpload({
    context,
    object: { vault: "brightline", objectKey: input.objectKey },
    contentType: input.contentType,
    visibility: "public",
  });

  return {
    ok: true,
    url: signed.uploadUrl,
    headers: { ...(signed.headers ?? {}) },
    key: input.objectKey,
    publicUrl: getPublicR2Url(input.objectKey),
  };
}

/** Safe client-facing message — never expose raw R2/AWS errors. */
export function siteMediaUploadUrlErrorMessage(error: unknown): string {
  if (isMediaError(error)) {
    if (error.code === "configuration") {
      return "Media storage is not configured.";
    }
    return "Could not prepare upload.";
  }
  return "Could not prepare upload.";
}
