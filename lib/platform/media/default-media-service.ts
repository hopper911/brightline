import "server-only";

import { isAllowedPublicMediaKey } from "@/lib/media-key-access";
import { resolveStoredMediaUrl } from "@/lib/r2";
import type { MediaProvider } from "@/lib/platform/media/media-provider";
import type { MediaService } from "@/lib/platform/media/media-service";
import type { PlatformContext } from "@/lib/platform/context/types";
import type {
  MediaDeliveryUrl,
  MediaObjectRef,
  MediaUploadRequest,
  MediaUploadResult,
  SignedMediaReadUrl,
} from "@/lib/platform/media/types";
import { resolveMediaPublicBaseUrl } from "@/lib/platform/media/resolve-bucket";
import { r2MediaProvider } from "@/lib/platform/media/r2-media-provider";
import { assertValidMediaObjectKey } from "@/lib/platform/media/validate-object-key";

const DEFAULT_READ_EXPIRES_SECONDS = 3600;

function resolveMirotechPublicDeliveryUrl(objectKey: string): string | null {
  const base = resolveMediaPublicBaseUrl("mirotech-site");
  if (base) return `${base}/${objectKey}`;
  const fromEnv =
    process.env.NEXT_PUBLIC_MIROTECH_R2_PUBLIC_URL?.trim().replace(/\/$/, "") ||
    process.env.MIROTECH_R2_PUBLIC_URL?.trim().replace(/\/$/, "");
  if (!fromEnv) return null;
  return `${fromEnv}/${objectKey}`;
}

/**
 * Application-facing media service — uses MediaProvider, not S3Client directly.
 * Tenant on PlatformContext is ownership metadata only (no key rewrites).
 */
export class DefaultMediaService implements MediaService {
  constructor(private readonly provider: MediaProvider) {}

  async createUpload(request: MediaUploadRequest): Promise<MediaUploadResult> {
    void request.context;
    const objectKey = assertValidMediaObjectKey(request.object.objectKey);
    const access = request.visibility === "public" ? "public-read" : "private";
    return this.provider.signPut({
      object: { vault: request.object.vault, objectKey },
      contentType: request.contentType,
      expiresInSeconds: request.expiresInSeconds,
      access,
    });
  }

  async getAssetUrl(context: PlatformContext, object: MediaObjectRef): Promise<MediaDeliveryUrl> {
    void context;
    const objectKey = assertValidMediaObjectKey(object.objectKey);

    if (object.vault === "brightline" && isAllowedPublicMediaKey(objectKey)) {
      return {
        kind: "public-delivery",
        url: resolveStoredMediaUrl(objectKey),
      };
    }

    if (object.vault === "mirotech-site") {
      const publicUrl = resolveMirotechPublicDeliveryUrl(objectKey);
      if (publicUrl) {
        return { kind: "public-delivery", url: publicUrl };
      }
    }

    return this.provider.signGet({
      object: { vault: object.vault, objectKey },
      expiresInSeconds: DEFAULT_READ_EXPIRES_SECONDS,
    });
  }

  async createDownloadUrl(
    context: PlatformContext,
    object: MediaObjectRef,
    options?: { expiresInSeconds?: number }
  ): Promise<SignedMediaReadUrl> {
    void context;
    const objectKey = assertValidMediaObjectKey(object.objectKey);
    return this.provider.signGet({
      object: { vault: object.vault, objectKey },
      expiresInSeconds: options?.expiresInSeconds ?? DEFAULT_READ_EXPIRES_SECONDS,
    });
  }

  async exists(context: PlatformContext, object: MediaObjectRef): Promise<boolean> {
    void context;
    const objectKey = assertValidMediaObjectKey(object.objectKey);
    return this.provider.exists({ vault: object.vault, objectKey });
  }
}
