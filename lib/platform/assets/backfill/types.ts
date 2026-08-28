import type { PlatformAssetVisibility } from "@/lib/platform/assets/types";
import type { MediaStorageVault } from "@/lib/platform/media/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";

/** Supported database-driven backfill sources (Phase 4B). */
export const ASSET_BACKFILL_SOURCES = ["brightline-portfolio"] as const;
export type AssetBackfillSource = (typeof ASSET_BACKFILL_SOURCES)[number];

export type AssetBackfillCandidate = {
  source: AssetBackfillSource;
  recordId: string;
  recordType: string;
  objectKey: string;
  vault: MediaStorageVault;
  tenantSlug: TenantSlug;
  visibility: PlatformAssetVisibility;
  filename?: string | null;
  mimeType?: string | null;
  metadata?: Record<string, unknown> | null;
  /** When visibility could not be inferred confidently from public semantics. */
  visibilityAmbiguous?: boolean;
};

export type AssetBackfillRunOptions = {
  source: AssetBackfillSource;
  dryRun: boolean;
  limit?: number;
  cursor?: string;
  recordId?: string;
  verifyStorage?: boolean;
  /** Phase 4C: link domain rows to existing platform_assets (no registry upsert). */
  linkDomain?: boolean;
};

export type AssetBackfillFailure = {
  recordId: string;
  recordType: string;
  reason:
    | "invalidReference"
    | "missingTenant"
    | "missingBucket"
    | "conflict"
    | "missingStorage"
    | "error";
  message: string;
};

export type AssetBackfillCollectionResult = {
  rowsExamined: number;
  candidates: AssetBackfillCandidate[];
  invalidReferences: Array<{
    recordId: string;
    recordType: string;
    message: string;
  }>;
};

export type AssetBackfillReport = {
  source: AssetBackfillSource;
  dryRun: boolean;
  examined: number;
  validReferences: number;
  registered: number;
  alreadyRegistered: number;
  wouldRegister: number;
  skipped: number;
  invalidReference: number;
  missingTenant: number;
  missingStorage: number;
  missingStorageObjects: number;
  conflicts: number;
  errors: number;
  failures: AssetBackfillFailure[];
};

export function createEmptyBackfillReport(
  source: AssetBackfillSource,
  dryRun: boolean
): AssetBackfillReport {
  return {
    source,
    dryRun,
    examined: 0,
    validReferences: 0,
    registered: 0,
    alreadyRegistered: 0,
    wouldRegister: 0,
    skipped: 0,
    invalidReference: 0,
    missingTenant: 0,
    missingStorage: 0,
    missingStorageObjects: 0,
    conflicts: 0,
    errors: 0,
    failures: [],
  };
}

export function isAssetBackfillSource(value: string): value is AssetBackfillSource {
  return (ASSET_BACKFILL_SOURCES as readonly string[]).includes(value);
}
