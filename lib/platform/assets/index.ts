export type {
  MediaReference,
  PlatformAssetRecord,
  PlatformAssetStorageRef,
  PlatformAssetVisibility,
  PlatformMediaAssetRefCompat,
  PlatformStorageProvider,
  RegisterPlatformAssetInput,
  RegisterPlatformAssetResult,
} from "@/lib/platform/assets/types";

export {
  isMediaObjectRef,
  isMediaReferenceWithAssetId,
  isPlatformStorageProvider,
  mediaVisibilityToPlatformAssetVisibility,
  platformAssetVisibilityToMediaVisibility,
  PLATFORM_ASSET_VISIBILITY_VALUES,
  PLATFORM_STORAGE_PROVIDERS,
} from "@/lib/platform/assets/types";

export { PlatformAssetNotFoundError, resolveMediaReferenceToObjectRef } from "@/lib/platform/assets/resolve-reference";
export {
  portfolioImageLegacyReference,
  resolveDomainMedia,
  type DomainMediaConflict,
  type DomainMediaInput,
  type ResolveDomainMediaResult,
} from "@/lib/platform/assets/resolve-domain-media";
