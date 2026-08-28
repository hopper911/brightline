/**
 * Server-only asset registry implementations.
 */

export { PlatformAssetRegistryService, platformAssetRegistryService } from "@/lib/platform/assets/registry-service";
export {
  createPlatformAsset,
  findPlatformAssetById,
  findPlatformAssetByStorageRef,
  upsertPlatformAssetFromStorageRef,
} from "@/lib/platform/assets/repository";
