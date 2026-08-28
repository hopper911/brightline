/**
 * Platform job domain types (Phase 7A).
 * Infrastructure only — no production consumers yet.
 */

import type { TenantSlug } from "@/lib/platform/tenants/types";

export const JOB_STATUSES = ["PENDING", "RUNNING", "COMPLETED", "FAILED"] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

/** Machine-readable job types: lowercase segments separated by dots. */
export const PLATFORM_JOB_TYPE_PATTERN = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/;

/** Development / test job — no production mutation (Phase 7A). */
export const PLATFORM_HEALTH_TEST_JOB = "platform.health.test" as const;

/** Brightline blog → Mirotech journal sync (Phase 7B). */
export const PUBLISHING_MIROTECH_JOURNAL_SYNC_JOB = "publishing.mirotech.journal.sync" as const;

/** Mirotech Studio Hub case study PATCH → remote CMS (Phase 7C). */
export const PUBLISHING_MIROTECH_HUB_PATCH_JOB = "publishing.mirotech.hub.patch" as const;

export type KnownPlatformJobType =
  | typeof PLATFORM_HEALTH_TEST_JOB
  | typeof PUBLISHING_MIROTECH_JOURNAL_SYNC_JOB
  | typeof PUBLISHING_MIROTECH_HUB_PATCH_JOB;

/** Serializable job input — IDs and references only; validated by payload-security. */
export type JobPayload = Readonly<Record<string, unknown>>;

export type JobRecord = {
  id: string;
  tenantSlug: TenantSlug;
  type: string;
  status: JobStatus;
  payload: JobPayload;
  attempts: number;
  idempotencyKey: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  errorSummary: string | null;
};

export type EnqueueJobInput = {
  type: string;
  payload?: JobPayload;
  idempotencyKey?: string;
};

export type EnqueueJobResult = {
  jobId: string;
  /** True when an existing idempotent job was returned without creating a duplicate. */
  reused?: boolean;
  status?: JobStatus;
};

export function isJobStatus(value: unknown): value is JobStatus {
  return typeof value === "string" && (JOB_STATUSES as readonly string[]).includes(value);
}

export function isValidPlatformJobType(type: string): boolean {
  return PLATFORM_JOB_TYPE_PATTERN.test(type.trim());
}

export function assertValidEnqueueInput(input: EnqueueJobInput): EnqueueJobInput {
  const type = input.type?.trim();
  if (!type || !isValidPlatformJobType(type)) {
    throw new Error(`Invalid job type "${input.type ?? ""}". Expected dotted lowercase segments.`);
  }
  return {
    type,
    payload: input.payload ?? {},
  };
}
