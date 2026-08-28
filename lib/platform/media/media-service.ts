/**
 * Application-facing media boundary (Phase 3A contract — no implementation yet).
 * Future implementation delegates to MediaProvider (R2 adapter) when PLATFORM_MEDIA_ENABLED.
 */

import type { PlatformContext } from "@/lib/platform/context/types";
import type {
  MediaDeliveryUrl,
  MediaObjectRef,
  MediaUploadRequest,
  MediaUploadResult,
  SignedMediaReadUrl,
} from "@/lib/platform/media/types";

export interface MediaService {
  /** Presigned upload URL for a new object key. */
  createUpload(request: MediaUploadRequest): Promise<MediaUploadResult>;

  /**
   * Resolve delivery URL for an object — public proxy route or signed read,
   * based on visibility and tenant context.
   */
  getAssetUrl(context: PlatformContext, object: MediaObjectRef): Promise<MediaDeliveryUrl>;

  /** Presigned read URL (private/admin objects). */
  createDownloadUrl(
    context: PlatformContext,
    object: MediaObjectRef,
    options?: { expiresInSeconds?: number }
  ): Promise<SignedMediaReadUrl>;

  /** Object existence check (HeadObject). */
  exists(context: PlatformContext, object: MediaObjectRef): Promise<boolean>;
}

/** Alias aligned with Phase 1A service boundary naming. */
export type PlatformMediaService = MediaService;
