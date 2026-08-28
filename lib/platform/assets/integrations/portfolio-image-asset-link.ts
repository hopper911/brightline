import { findPlatformAssetsByObjectKeys } from "@/lib/platform/assets/repository-batch";
import { getR2VaultCredentials } from "@/lib/r2-vaults";

/** Opportunistic dual-write: link assetId when registry row already exists for the storage key. */
export async function lookupPlatformAssetIdsForBrightlineKeys(
  objectKeys: Array<string | null | undefined>
): Promise<Map<string, string>> {
  const keys = objectKeys.map((k) => k?.trim()).filter((k): k is string => Boolean(k));
  if (keys.length === 0) return new Map();

  const bucket = getR2VaultCredentials("brightline").bucket;
  const assets = await findPlatformAssetsByObjectKeys(bucket, keys);
  const out = new Map<string, string>();
  for (const [objectKey, asset] of assets) {
    out.set(objectKey, asset.id);
  }
  return out;
}

export async function lookupPlatformAssetIdForBrightlineKey(
  objectKey: string | null | undefined
): Promise<string | null> {
  if (!objectKey?.trim()) return null;
  const map = await lookupPlatformAssetIdsForBrightlineKeys([objectKey]);
  return map.get(objectKey.trim()) ?? null;
}
