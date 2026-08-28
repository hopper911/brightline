import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { collectBackfillCandidates } from "@/lib/platform/assets/backfill/collect-candidates";
import {
  createEmptyBackfillReport,
  type AssetBackfillFailure,
  type AssetBackfillReport,
  type AssetBackfillRunOptions,
} from "@/lib/platform/assets/backfill/types";
import {
  findPlatformAssetByStorageRef,
  upsertPlatformAssetFromStorageRef,
} from "@/lib/platform/assets/repository";
import { recordAuditSafely } from "@/lib/platform/audit/record-safely";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import type { MediaStorageVault } from "@/lib/platform/media/types";
import { ensurePlatformTenant } from "@/lib/platform/tenants/repository";
import { getR2VaultCredentials } from "@/lib/r2-vaults";
import { headObject } from "@/lib/storage-r2";

function resolveBucketForVault(vault: MediaStorageVault): string {
  return getR2VaultCredentials(vault).bucket;
}

function pushFailure(
  report: AssetBackfillReport,
  failure: AssetBackfillFailure
): void {
  report.failures.push(failure);
  switch (failure.reason) {
    case "invalidReference":
      report.invalidReference += 1;
      break;
    case "missingTenant":
      report.missingTenant += 1;
      break;
    case "missingBucket":
      report.missingStorage += 1;
      break;
    case "conflict":
      report.conflicts += 1;
      break;
    case "missingStorage":
      report.missingStorageObjects += 1;
      break;
    case "error":
      report.errors += 1;
      break;
    default:
      report.errors += 1;
  }
}

/**
 * Controlled, idempotent asset registry backfill — database-driven, no R2 scans.
 * Writes directly via repository (does not require PLATFORM_ASSET_REGISTRY_ENABLED).
 */
export async function runAssetBackfill(
  options: AssetBackfillRunOptions,
  client: PrismaClient = prisma
): Promise<AssetBackfillReport> {
  const report = createEmptyBackfillReport(options.source, options.dryRun);

  const collection = await collectBackfillCandidates(
    {
      source: options.source,
      limit: options.limit,
      cursor: options.cursor,
      recordId: options.recordId,
    },
    client
  );

  const candidates = collection.candidates;
  report.examined = collection.rowsExamined;

  for (const invalid of collection.invalidReferences) {
    pushFailure(report, {
      recordId: invalid.recordId,
      recordType: invalid.recordType,
      reason: "invalidReference",
      message: invalid.message,
    });
    report.skipped += 1;
  }

  try {
    resolveBucketForVault("brightline");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bucket resolution failed.";
    pushFailure(report, {
      recordId: "*",
      recordType: "config",
      reason: "missingBucket",
      message,
    });
    return report;
  }

  const tenantCache = new Map<string, Awaited<ReturnType<typeof ensurePlatformTenant>>>();

  for (const candidate of candidates) {
    report.validReferences += 1;

    let bucket: string;
    try {
      bucket = resolveBucketForVault(candidate.vault);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bucket resolution failed.";
      pushFailure(report, {
        recordId: candidate.recordId,
        recordType: candidate.recordType,
        reason: "missingBucket",
        message,
      });
      report.skipped += 1;
      continue;
    }

    let tenant = tenantCache.get(candidate.tenantSlug);
    if (!tenant) {
      try {
        tenant = await ensurePlatformTenant(candidate.tenantSlug, client);
        tenantCache.set(candidate.tenantSlug, tenant);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Tenant resolution failed.";
        pushFailure(report, {
          recordId: candidate.recordId,
          recordType: candidate.recordType,
          reason: "missingTenant",
          message,
        });
        report.skipped += 1;
        continue;
      }
    }

    const storageRef = {
      provider: "R2" as const,
      bucket,
      objectKey: candidate.objectKey,
    };

    if (options.verifyStorage) {
      try {
        const head = await headObject(candidate.objectKey, candidate.vault);
        if (!head) {
          pushFailure(report, {
            recordId: candidate.recordId,
            recordType: candidate.recordType,
            reason: "missingStorage",
            message: `Object not found: ${candidate.objectKey}`,
          });
          report.skipped += 1;
          continue;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Storage verification failed.";
        pushFailure(report, {
          recordId: candidate.recordId,
          recordType: candidate.recordType,
          reason: "error",
          message,
        });
        report.skipped += 1;
        continue;
      }
    }

    let existing;
    try {
      existing = await findPlatformAssetByStorageRef(storageRef, client);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registry lookup failed.";
      pushFailure(report, {
        recordId: candidate.recordId,
        recordType: candidate.recordType,
        reason: "error",
        message,
      });
      report.skipped += 1;
      continue;
    }

    if (existing) {
      if (existing.tenantSlug !== candidate.tenantSlug) {
        pushFailure(report, {
          recordId: candidate.recordId,
          recordType: candidate.recordType,
          reason: "conflict",
          message: `Existing asset ${existing.id} owned by ${existing.tenantSlug}, expected ${candidate.tenantSlug}.`,
        });
        report.skipped += 1;
        continue;
      }
      report.alreadyRegistered += 1;
      continue;
    }

    if (options.dryRun) {
      report.wouldRegister += 1;
      continue;
    }

    try {
      const { created } = await upsertPlatformAssetFromStorageRef(
        {
          tenantId: tenant.id,
          tenantSlug: candidate.tenantSlug,
          provider: "R2",
          vault: candidate.vault,
          bucket,
          objectKey: candidate.objectKey,
          filename: candidate.filename ?? null,
          mimeType: candidate.mimeType ?? null,
          visibility: candidate.visibility,
          metadata: candidate.metadata ?? null,
        },
        client
      );

      if (created) {
        report.registered += 1;
      } else {
        report.alreadyRegistered += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registry write failed.";
      pushFailure(report, {
        recordId: candidate.recordId,
        recordType: candidate.recordType,
        reason: "error",
        message,
      });
      report.skipped += 1;
    }
  }

  if (!options.dryRun && report.registered > 0 && isPlatformFeatureEnabled("audit")) {
    const context = createPlatformContextForTenant(
      options.source === "brightline-portfolio" ? "brightline" : "brightline"
    );
    await recordAuditSafely({
      context,
      actor: { type: "SYSTEM" },
      action: "asset.backfill.completed",
      resource: { type: "asset_backfill", id: options.source },
      metadata: {
        source: options.source,
        examined: report.examined,
        registered: report.registered,
        alreadyRegistered: report.alreadyRegistered,
        skipped: report.skipped,
        invalidReference: report.invalidReference,
        missingStorageObjects: report.missingStorageObjects,
        conflicts: report.conflicts,
        errors: report.errors,
        verifyStorage: Boolean(options.verifyStorage),
      },
    });
  }

  return report;
}

export function formatBackfillReport(report: AssetBackfillReport): string {
  const lines = [
    `Asset backfill (${report.source})${report.dryRun ? " [DRY RUN]" : ""}`,
    `  examined:            ${report.examined}`,
    `  validReferences:     ${report.validReferences}`,
    `  registered:          ${report.registered}`,
    `  alreadyRegistered:   ${report.alreadyRegistered}`,
    `  wouldRegister:       ${report.wouldRegister}`,
    `  skipped:             ${report.skipped}`,
    `  invalidReference:    ${report.invalidReference}`,
    `  missingTenant:       ${report.missingTenant}`,
    `  missingBucketConfig: ${report.missingStorage}`,
    `  missingStorage:      ${report.missingStorageObjects}`,
    `  conflicts:           ${report.conflicts}`,
    `  errors:              ${report.errors}`,
  ];

  if (report.failures.length > 0) {
    lines.push("  failures:");
    for (const failure of report.failures.slice(0, 25)) {
      lines.push(`    - ${failure.recordType}:${failure.recordId} (${failure.reason}): ${failure.message}`);
    }
    if (report.failures.length > 25) {
      lines.push(`    … and ${report.failures.length - 25} more`);
    }
  }

  return lines.join("\n");
}
