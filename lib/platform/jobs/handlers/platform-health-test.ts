import type { PlatformContext } from "@/lib/platform/context/types";
import type { JobRecord } from "@/lib/platform/jobs/types";

/**
 * No-op health check job for Phase 7A validation.
 * Safe to run in any environment — performs no DB, R2, or remote writes.
 */
export async function runPlatformHealthTestJob(
  _context: PlatformContext,
  _job: JobRecord
): Promise<void> {
  // Intentionally empty — success means the job pipeline executed.
}
