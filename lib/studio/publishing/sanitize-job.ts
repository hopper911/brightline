import type { JobRecord } from "@/lib/platform/jobs/types";
import {
  readPublishingJobResult,
  type PublishingJobResult,
} from "@/lib/platform/jobs/publishing-payload";
import type { ContentRef } from "@/lib/platform/content/types";
import { isPublishTargetId, type PublishTargetId } from "@/lib/platform/publishing/types";

export type StudioPublishingJobView = {
  id: string;
  tenantSlug: string;
  type: string;
  status: JobRecord["status"];
  attempts: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  errorSummary: string | null;
  source: ContentRef | null;
  target: PublishTargetId | null;
  operation: string | null;
  result: Pick<PublishingJobResult, "ok" | "resourceId" | "error"> | null;
  retryable: boolean;
};

const RETRYABLE_TYPES = new Set([
  "publishing.mirotech.journal.sync",
  "publishing.mirotech.hub.patch",
]);

const MAX_RETRY_ATTEMPTS = 3;

function readSource(payload: JobRecord["payload"]): ContentRef | null {
  const raw = payload.source;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const source = raw as ContentRef;
  if (
    typeof source.tenant !== "string" ||
    typeof source.type !== "string" ||
    typeof source.id !== "string"
  ) {
    return null;
  }
  return source;
}

function readTarget(payload: JobRecord["payload"]): PublishTargetId | null {
  const raw = payload.target;
  if (typeof raw !== "string" || !isPublishTargetId(raw)) return null;
  return raw;
}

export function toStudioPublishingJobView(record: JobRecord): StudioPublishingJobView {
  const result = readPublishingJobResult(record.payload);
  const safeResult = result
    ? {
        ok: result.ok,
        resourceId: result.resourceId ?? null,
        error: result.error,
      }
    : null;

  const retryable =
    record.status === "FAILED" &&
    RETRYABLE_TYPES.has(record.type) &&
    record.attempts < MAX_RETRY_ATTEMPTS;

  return {
    id: record.id,
    tenantSlug: record.tenantSlug,
    type: record.type,
    status: record.status,
    attempts: record.attempts,
    createdAt: record.createdAt,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    failedAt: record.failedAt,
    errorSummary: record.errorSummary,
    source: readSource(record.payload),
    target: readTarget(record.payload),
    operation:
      typeof record.payload.operation === "string" ? record.payload.operation : null,
    result: safeResult,
    retryable,
  };
}
