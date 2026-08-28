import "server-only";

import { recordAuditSafely } from "@/lib/platform/audit/record-safely";
import type { PlatformContext } from "@/lib/platform/context/types";
import {
  findPlatformAssetById,
  findPlatformAssetByStorageRef,
  listPlatformAssetsByTenantSlug,
  upsertPlatformAssetFromStorageRef,
  type PlatformAssetListResult,
} from "@/lib/platform/assets/repository";
import type {
  PlatformAssetRecord,
  PlatformAssetStorageRef,
  RegisterPlatformAssetInput,
  RegisterPlatformAssetResult,
} from "@/lib/platform/assets/types";
import { mediaVisibilityToPlatformAssetVisibility } from "@/lib/platform/assets/types";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import { resolveMediaBucket } from "@/lib/platform/media/resolve-bucket";
import { assertValidMediaObjectKey } from "@/lib/platform/media/validate-object-key";
import { ensurePlatformTenant } from "@/lib/platform/tenants/repository";

function logRegistryFailure(message: string): void {
  console.error(`[platform-asset-registry] ${message}`);
}

/**
 * Platform asset registry — optional registration behind PLATFORM_ASSET_REGISTRY_ENABLED.
 * Failures do not block media upload/delivery unless callers opt into strict mode.
 */
export class PlatformAssetRegistryService {
  async findById(assetId: string): Promise<PlatformAssetRecord | null> {
    return findPlatformAssetById(assetId);
  }

  async findByStorageRef(ref: PlatformAssetStorageRef): Promise<PlatformAssetRecord | null> {
    return findPlatformAssetByStorageRef(ref);
  }

  async listByTenant(
    context: PlatformContext,
    options?: { limit?: number; cursor?: string }
  ): Promise<PlatformAssetListResult> {
    if (!isPlatformFeatureEnabled("assets")) {
      return { items: [] };
    }
    return listPlatformAssetsByTenantSlug(context.tenant.slug, options);
  }

  async register(
    context: PlatformContext,
    input: RegisterPlatformAssetInput,
    options?: { strict?: boolean }
  ): Promise<RegisterPlatformAssetResult> {
    if (!isPlatformFeatureEnabled("assets")) {
      return { ok: true, skipped: true, reason: "disabled" };
    }

    try {
      const objectKey = assertValidMediaObjectKey(input.object.objectKey);
      const tenant = await ensurePlatformTenant(context.tenant.slug);
      const bucket = resolveMediaBucket(input.object.vault);
      const visibility = mediaVisibilityToPlatformAssetVisibility(input.visibility);

      const { asset, created } = await upsertPlatformAssetFromStorageRef({
        tenantId: tenant.id,
        tenantSlug: context.tenant.slug,
        provider: "R2",
        vault: input.object.vault,
        bucket,
        objectKey,
        filename: input.filename ?? null,
        mimeType: input.mimeType ?? null,
        visibility,
        metadata: input.metadata ?? null,
      });

      if (created) {
        await recordAuditSafely({
          context,
          actor: { type: "SYSTEM" },
          action: "asset.registered",
          resource: { type: "platform_asset", id: asset.id },
          metadata: {
            provider: asset.provider,
            bucket: asset.bucket,
            objectKey: asset.objectKey,
            vault: asset.vault,
          },
        });
      }

      return { ok: true, skipped: false, asset, created };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Asset registration failed.";
      logRegistryFailure(message);
      if (options?.strict) {
        return { ok: false, error: message };
      }
      return { ok: true, skipped: true, reason: "failed", error: message };
    }
  }
}

export const platformAssetRegistryService = new PlatformAssetRegistryService();
