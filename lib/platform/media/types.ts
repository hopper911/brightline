/**
 * Platform media domain types (Phase 3A — contracts only, no R2 adapter yet).
 */

import type { PlatformContext } from "@/lib/platform/context/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";

/** Logical R2 vault ids — mirrors lib/r2-vaults-shared (not imported to keep layer decoupled). */
export type MediaStorageVault = "brightline" | "mirotech-site";

/** Storage object identity — bucket resolved via vault credentials at provider layer. */
export type MediaObjectRef = {
  vault: MediaStorageVault;
  objectKey: string;
};

/**
 * Platform asset identity (Phase 4A+).
 * When `assetId` is set, storage fields remain for transitional dual-read paths.
 */
export type PlatformMediaAssetRef = {
  assetId?: string;
  tenantSlug: TenantSlug;
  object: MediaObjectRef;
};

/** Access class for uploads and delivery — maps to existing prefix policy. */
export type MediaVisibility = "public" | "private" | "admin";

export type MediaUploadRequest = {
  context: PlatformContext;
  object: MediaObjectRef;
  contentType: string;
  visibility: MediaVisibility;
  expiresInSeconds?: number;
};

/** Presigned PUT — short-lived, never persisted in database. */
export type MediaSignedUpload = {
  kind: "signed-upload";
  uploadUrl: string;
  expiresInSeconds: number;
  headers?: Readonly<Record<string, string>>;
  object: MediaObjectRef;
};

/** Same-origin or stable app route for public-prefix objects (e.g. /api/media/public?key=). */
export type PublicMediaDeliveryUrl = {
  kind: "public-delivery";
  url: string;
};

/** Presigned GET — short-lived read URL; never store in DB. */
export type SignedMediaReadUrl = {
  kind: "signed-read";
  url: string;
  expiresInSeconds: number;
};

export type MediaDeliveryUrl = PublicMediaDeliveryUrl | SignedMediaReadUrl;

export type MediaUploadResult = MediaSignedUpload;

export type MediaHeadResult = {
  size: number;
  lastModified: string | null;
  contentType?: string | null;
};

export function normalizeMediaObjectKey(key: string): string {
  return key.trim().replace(/^\/+/, "");
}

export function isMediaStorageVault(value: unknown): value is MediaStorageVault {
  return value === "brightline" || value === "mirotech-site";
}

/** Map platform tenant slug to default vault for metadata (does not change storage paths). */
export function defaultVaultForTenant(slug: TenantSlug): MediaStorageVault {
  return slug === "mirotech" ? "mirotech-site" : "brightline";
}
