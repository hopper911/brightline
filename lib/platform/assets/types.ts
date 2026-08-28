/**
 * Platform asset registry domain types (Phase 4A).
 */

import type { MediaObjectRef, MediaVisibility } from "@/lib/platform/media/types";
import type { MediaStorageVault } from "@/lib/platform/media/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";

export const PLATFORM_STORAGE_PROVIDERS = ["R2"] as const;
export type PlatformStorageProvider = (typeof PLATFORM_STORAGE_PROVIDERS)[number];

export const PLATFORM_ASSET_VISIBILITY_VALUES = ["PUBLIC", "PRIVATE"] as const;
export type PlatformAssetVisibility = (typeof PLATFORM_ASSET_VISIBILITY_VALUES)[number];

export type PlatformAssetStorageRef = {
  provider: PlatformStorageProvider;
  bucket: string;
  objectKey: string;
};

export type PlatformAssetRecord = {
  id: string;
  tenantId: string;
  tenantSlug: TenantSlug;
  provider: PlatformStorageProvider;
  vault: MediaStorageVault;
  bucket: string;
  objectKey: string;
  filename: string | null;
  mimeType: string | null;
  visibility: PlatformAssetVisibility;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Transitional reference — asset id and/or direct storage object. */
export type MediaReference =
  | MediaObjectRef
  | { assetId: string }
  | PlatformMediaAssetRefCompat;

/** Compatible with Phase 3A PlatformMediaAssetRef. */
export type PlatformMediaAssetRefCompat = {
  assetId?: string;
  tenantSlug: TenantSlug;
  object: MediaObjectRef;
};

export type RegisterPlatformAssetInput = {
  object: MediaObjectRef;
  filename?: string | null;
  mimeType?: string | null;
  visibility?: MediaVisibility;
  metadata?: Record<string, unknown> | null;
};

export type RegisterPlatformAssetResult =
  | { ok: true; skipped: true; reason: "disabled" | "failed"; error?: string }
  | { ok: true; skipped: false; asset: PlatformAssetRecord; created: boolean }
  | { ok: false; error: string };

export function isPlatformStorageProvider(value: unknown): value is PlatformStorageProvider {
  return value === "R2";
}

export function mediaVisibilityToPlatformAssetVisibility(
  visibility: MediaVisibility | undefined
): PlatformAssetVisibility {
  return visibility === "public" ? "PUBLIC" : "PRIVATE";
}

export function platformAssetVisibilityToMediaVisibility(
  visibility: PlatformAssetVisibility
): MediaVisibility {
  return visibility === "PUBLIC" ? "public" : "private";
}

export function isMediaReferenceWithAssetId(
  reference: MediaReference
): reference is { assetId: string } {
  return "assetId" in reference && typeof reference.assetId === "string" && reference.assetId.length > 0;
}

export function isMediaObjectRef(reference: MediaReference): reference is MediaObjectRef {
  return "vault" in reference && "objectKey" in reference && !("assetId" in reference);
}
