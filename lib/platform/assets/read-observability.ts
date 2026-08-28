/** In-process counters for asset-read cutover (Phase 4D). Not a full analytics pipeline. */

export type AssetReadMetricKey =
  | "assetReadSuccess"
  | "assetFallbackLegacy"
  | "assetMissing"
  | "assetTenantMismatch";

export type AssetReadMetrics = Record<AssetReadMetricKey, number>;

const METRIC_KEYS: AssetReadMetricKey[] = [
  "assetReadSuccess",
  "assetFallbackLegacy",
  "assetMissing",
  "assetTenantMismatch",
];

function emptyMetrics(): AssetReadMetrics {
  return {
    assetReadSuccess: 0,
    assetFallbackLegacy: 0,
    assetMissing: 0,
    assetTenantMismatch: 0,
  };
}

let metrics: AssetReadMetrics = emptyMetrics();

export function recordAssetReadMetric(key: AssetReadMetricKey, detail?: string): void {
  metrics[key] += 1;
  if (detail) {
    console.info(`[platform-asset-read] ${key} ${detail}`);
  } else {
    console.info(`[platform-asset-read] ${key}`);
  }
}

export function getAssetReadMetrics(): AssetReadMetrics {
  return { ...metrics };
}

export function resetAssetReadMetrics(): void {
  metrics = emptyMetrics();
}

export function formatAssetReadMetrics(summary: AssetReadMetrics): string {
  return METRIC_KEYS.map((k) => `  ${k}: ${summary[k]}`).join("\n");
}
