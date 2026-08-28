import "server-only";

import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import { platformAssetRegistryService } from "@/lib/platform/assets/registry-service";
import type { PlatformAssetRecord } from "@/lib/platform/assets/types";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import type { TenantSlug } from "@/lib/platform/tenants/types";

export type StudioAssetListing = {
  tenant: TenantSlug;
  enabled: boolean;
  partialCoverage: boolean;
  items: PlatformAssetRecord[];
  nextCursor?: string;
};

export async function listStudioAssetsForTenant(
  tenant: TenantSlug,
  options?: { limit?: number; cursor?: string }
): Promise<StudioAssetListing> {
  if (!isPlatformFeatureEnabled("assets")) {
    return {
      tenant,
      enabled: false,
      partialCoverage: true,
      items: [],
    };
  }

  const context = createPlatformContextForTenant(tenant);
  const { items, nextCursor } = await platformAssetRegistryService.listByTenant(context, options);

  return {
    tenant,
    enabled: true,
    partialCoverage: true,
    items,
    nextCursor,
  };
}

export async function getStudioAssetDetail(
  tenant: TenantSlug,
  assetId: string
): Promise<PlatformAssetRecord | null> {
  if (!isPlatformFeatureEnabled("assets")) return null;
  const asset = await platformAssetRegistryService.findById(assetId);
  if (!asset || asset.tenantSlug !== tenant) return null;
  return asset;
}

export function studioAssetDimensions(
  metadata: Record<string, unknown> | null | undefined
): { width?: number; height?: number } {
  if (!metadata) return {};
  const width = typeof metadata.width === "number" ? metadata.width : undefined;
  const height = typeof metadata.height === "number" ? metadata.height : undefined;
  return { width, height };
}
