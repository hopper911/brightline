export * from "@/lib/platform/tenants";
export * from "@/lib/platform/context";
export * from "@/lib/platform/audit";
export * from "@/lib/platform/media";
export * from "@/lib/platform/content";
export * from "@/lib/platform/publishing";
export * from "@/lib/platform/jobs";
export * from "@/lib/platform/identity";
export * from "@/lib/platform/authorization";
export type {
  MediaReference,
  PlatformAssetRecord,
  PlatformAssetStorageRef,
  RegisterPlatformAssetInput,
  RegisterPlatformAssetResult,
} from "@/lib/platform/assets";
export {
  getPlatformFeatures,
  isPlatformFeatureEnabled,
  LEGACY_HANDOFF_FLAG,
  parsePlatformEnvFlag,
  PLATFORM_FEATURE_ENV_KEYS,
  PLATFORM_FLAG_REGISTRY,
  type PlatformFeatureKey,
  type PlatformFeatures,
  type PlatformFlagCategory,
} from "@/lib/platform/features";
export type {
  PlatformMediaService,
  PlatformPublishTarget,
  PlatformPublishingService,
} from "@/lib/platform/services/types";
