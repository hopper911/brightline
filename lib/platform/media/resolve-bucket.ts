import "server-only";

import { getR2VaultCredentials, isMirotechSiteVaultConfigured } from "@/lib/r2-vaults";
import type { MediaStorageVault } from "@/lib/platform/media/types";

/** Resolve bucket name for a vault — preserves existing dual-bucket strategy. */
export function resolveMediaBucket(vault: MediaStorageVault): string {
  return getR2VaultCredentials(vault).bucket;
}

/** Public URL base configured for a vault (may be empty). */
export function resolveMediaPublicBaseUrl(vault: MediaStorageVault): string {
  return getR2VaultCredentials(vault).publicUrl.replace(/\/$/, "");
}

export type MediaProviderConfiguration = {
  brightline: { configured: boolean; bucket: string | null };
  mirotechSite: { configured: boolean; bucket: string | null };
};

/** Optional dev smoke — reads env/credentials only; no object writes. */
export function verifyMediaProviderConfiguration(): MediaProviderConfiguration {
  let brightlineBucket: string | null = null;
  let brightlineConfigured = false;
  try {
    brightlineBucket = resolveMediaBucket("brightline");
    brightlineConfigured = Boolean(brightlineBucket);
  } catch {
    brightlineConfigured = false;
  }

  let mirotechBucket: string | null = null;
  let mirotechConfigured = false;
  if (isMirotechSiteVaultConfigured()) {
    try {
      mirotechBucket = resolveMediaBucket("mirotech-site");
      mirotechConfigured = Boolean(mirotechBucket);
    } catch {
      mirotechConfigured = false;
    }
  }

  return {
    brightline: { configured: brightlineConfigured, bucket: brightlineBucket },
    mirotechSite: { configured: mirotechConfigured, bucket: mirotechBucket },
  };
}
