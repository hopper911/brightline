/**
 * Application-facing media boundary (Phase 3A contract — no implementation yet).
 * Future implementation delegates to MediaProvider (R2 adapter) when PLATFORM_MEDIA_ENABLED.
 */

import type { PlatformContext } from "@/lib/platform/context/types";
import type {
  MediaDeliveryUrl,
  MediaHeadResult,
  MediaObjectRef,
  MediaUploadRequest,
  MediaUploadResult,
  SignedMediaReadUrl,
} from "@/lib/platform/media/types";
import type { MediaReference, RegisterPlatformAssetInput, RegisterPlatformAssetResult } from "@/lib/platform/assets/types";

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

  /** Object metadata (HeadObject) — null when not found. */
  headObject(context: PlatformContext, object: MediaObjectRef): Promise<MediaHeadResult | null>;

  /** Resolve legacy storage ref or platform asset id to MediaObjectRef. */
  resolveToObjectRef(context: PlatformContext, reference: MediaReference): Promise<MediaObjectRef>;

  /**
   * Register a storage object in the platform asset registry (optional, flag-gated).
   * Non-strict failures must not block upload/delivery callers.
   */
  registerAsset(
    context: PlatformContext,
    input: RegisterPlatformAssetInput,
    options?: { strict?: boolean }
  ): Promise<RegisterPlatformAssetResult>;
}

/** Alias aligned with Phase 1A service boundary naming. */
export type PlatformMediaService = MediaService;
