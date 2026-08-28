import "server-only";

import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import type { MediaService } from "@/lib/platform/media/media-service";
import type { MediaVisibility } from "@/lib/platform/media/types";

export type BrightlineUploadViaMediaServiceInput = {
  objectKey: string;
  contentType: string;
  visibility: MediaVisibility;
  expiresInSeconds?: number;
};

/** Shared Brightline vault upload signing via MediaService. */
export async function createBrightlineUploadViaMediaService(
  service: MediaService,
  input: BrightlineUploadViaMediaServiceInput
) {
  const context = createPlatformContextForTenant("brightline");
  return service.createUpload({
    context,
    object: { vault: "brightline", objectKey: input.objectKey },
    contentType: input.contentType,
    visibility: input.visibility,
    expiresInSeconds: input.expiresInSeconds,
  });
}
