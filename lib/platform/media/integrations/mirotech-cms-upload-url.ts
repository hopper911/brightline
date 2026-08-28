import "server-only";

import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import type { MediaService } from "@/lib/platform/media/media-service";

export type MirotechCmsUploadUrlSuccess = {
  ok: true;
  key: string;
  uploadUrl: string;
  headers: Record<string, string>;
  expiresIn: number;
  access: "public-read" | "private";
  vault: "mirotech-site";
};

export type MirotechCmsUploadUrlViaMediaServiceInput = {
  objectKey: string;
  contentType: string;
  access: "public-read" | "private";
  expiresInSeconds?: number;
};

/** Phase 3F — Mirotech CMS bucket presigned PUT (mirotech-site vault). */
export async function createMirotechCmsUploadUrlViaMediaService(
  service: MediaService,
  input: MirotechCmsUploadUrlViaMediaServiceInput
): Promise<MirotechCmsUploadUrlSuccess> {
  const context = createPlatformContextForTenant("mirotech");
  const visibility = input.access === "public-read" ? "public" : "private";
  const signed = await service.createUpload({
    context,
    object: { vault: "mirotech-site", objectKey: input.objectKey },
    contentType: input.contentType,
    visibility,
    expiresInSeconds: input.expiresInSeconds,
  });

  return {
    ok: true,
    key: input.objectKey,
    uploadUrl: signed.uploadUrl,
    headers: { ...(signed.headers ?? {}) },
    expiresIn: signed.expiresInSeconds,
    access: input.access,
    vault: "mirotech-site",
  };
}
