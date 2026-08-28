import { platformAuditService } from "@/lib/platform/audit/audit-service";
import type { RecordPlatformAuditInput, RecordPlatformAuditResult } from "@/lib/platform/audit/types";

/**
 * Record a platform audit event without affecting the caller on failure.
 * Errors are logged by PlatformAuditService (strict defaults to false).
 */
export async function recordAuditSafely(
  input: RecordPlatformAuditInput
): Promise<RecordPlatformAuditResult> {
  return platformAuditService.record({ ...input, strict: false });
}
