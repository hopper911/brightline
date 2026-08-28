/**
 * Server-only media implementations — import from @/lib/platform/media/server in route handlers only.
 */

export {
  DefaultMediaService,
} from "@/lib/platform/media/default-media-service";
export {
  R2MediaProvider,
  r2MediaProvider,
} from "@/lib/platform/media/r2-media-provider";
import { DefaultMediaService } from "@/lib/platform/media/default-media-service";
import { r2MediaProvider } from "@/lib/platform/media/r2-media-provider";

export const defaultMediaService = new DefaultMediaService(r2MediaProvider);
export {
  resolveMediaBucket,
  resolveMediaPublicBaseUrl,
  verifyMediaProviderConfiguration,
  type MediaProviderConfiguration,
} from "@/lib/platform/media/resolve-bucket";
export {
  MediaConfigurationError,
  MediaDownloadError,
  MediaError,
  MediaNotFoundError,
  MediaUploadError,
  isMediaError,
  type MediaErrorCode,
} from "@/lib/platform/media/errors";
export { normalizeMediaError, isNotFoundError } from "@/lib/platform/media/normalize-error";
export { assertValidMediaObjectKey } from "@/lib/platform/media/validate-object-key";
