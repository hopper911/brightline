import "server-only";

import type { MediaService } from "@/lib/platform/media/media-service";
import { createBrightlineUploadViaMediaService } from "@/lib/platform/media/integrations/brightline-upload";

export type PortfolioPublicUploadUrlSuccess = {
  ok: true;
  url: string;
  headers: Record<string, string>;
};

export type PortfolioPublicUploadUrlViaMediaServiceInput = {
  objectKey: string;
  contentType: string;
};

/** Phase 3D — platform media path for portfolio-public drop upload URL. */
export async function createPortfolioPublicUploadUrlViaMediaService(
  service: MediaService,
  input: PortfolioPublicUploadUrlViaMediaServiceInput
): Promise<PortfolioPublicUploadUrlSuccess> {
  const signed = await createBrightlineUploadViaMediaService(service, {
    objectKey: input.objectKey,
    contentType: input.contentType,
    visibility: "private",
  });

  return {
    ok: true,
    url: signed.uploadUrl,
    headers: { ...(signed.headers ?? {}) },
  };
}
