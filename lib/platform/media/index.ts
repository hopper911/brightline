export type {
  MediaDeliveryUrl,
  MediaHeadResult,
  MediaObjectRef,
  MediaSignedUpload,
  MediaStorageVault,
  MediaUploadRequest,
  MediaUploadResult,
  MediaVisibility,
  PlatformMediaAssetRef,
  PublicMediaDeliveryUrl,
  SignedMediaReadUrl,
} from "@/lib/platform/media/types";

export {
  defaultVaultForTenant,
  isMediaStorageVault,
  normalizeMediaObjectKey,
} from "@/lib/platform/media/types";

export type {
  MediaProvider,
  MediaProviderSignGetInput,
  MediaProviderSignPutInput,
} from "@/lib/platform/media/media-provider";

export type { MediaService, PlatformMediaService } from "@/lib/platform/media/media-service";
