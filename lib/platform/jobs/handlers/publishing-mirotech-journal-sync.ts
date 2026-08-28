import "server-only";

import { recordAuditSafely } from "@/lib/platform/audit/record-safely";
import type { PlatformContext } from "@/lib/platform/context/types";
import { JobPayloadError } from "@/lib/platform/jobs/errors";
import type { JobHandler } from "@/lib/platform/jobs/job-handler-registry";
import type { JobProvider } from "@/lib/platform/jobs/job-provider";
import {
  MAX_PUBLISHING_JOB_ATTEMPTS,
  parsePublishingMirotechJournalSyncPayload,
  type PublishingJobResult,
} from "@/lib/platform/jobs/publishing-payload";
import type { JobRecord } from "@/lib/platform/jobs/types";
import { defaultPublishingService } from "@/lib/platform/publishing/default-publishing-service";
import type { DefaultPublishingService } from "@/lib/platform/publishing/default-publishing-service";
import { isPublishingError } from "@/lib/platform/publishing/errors";

export class PublishingJobExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublishingJobExecutionError";
  }
}

/**
 * Worker handler — trusted system publish after admin-authorized enqueue (Phase 7B).
 * Mirotech journal ingest upserts by brightlinePostId; safe for at-least-once execution.
 */
export function createPublishingMirotechJournalSyncHandler(
  publishingService: DefaultPublishingService = defaultPublishingService,
  provider?: JobProvider
): JobHandler {
  return async (context: PlatformContext, job: JobRecord) => {
    const parsed = parsePublishingMirotechJournalSyncPayload(job.payload);
    const resource = { type: parsed.source.type, id: parsed.source.id };

    await recordAuditSafely({
      context,
      actor: parsed.actor,
      action: "publishing.started",
      resource,
      metadata: {
        target: parsed.target,
        operation: parsed.operation,
        jobId: job.id,
        contentVersion: parsed.contentVersion,
      },
    });

    let result: PublishingJobResult;
    try {
      const publishResult = await publishingService.publish(context, {
        source: parsed.source,
        target: parsed.target,
        operation: parsed.operation,
      });

      if (publishResult.outcome === "completed") {
        result = {
          ok: true,
          resourceId: publishResult.resourceId ?? null,
        };
        await recordAuditSafely({
          context,
          actor: parsed.actor,
          action: "publishing.completed",
          resource,
          metadata: {
            target: parsed.target,
            resourceId: publishResult.resourceId ?? null,
            jobId: job.id,
          },
        });
      } else {
        const error = publishResult.message || "Mirotech publish failed";
        result = { ok: false, error };
        await recordAuditSafely({
          context,
          actor: parsed.actor,
          action: "publishing.failed",
          resource,
          metadata: { target: parsed.target, error, jobId: job.id },
        });
        if (provider) {
          await provider.update(job.id, {
            payload: { ...job.payload, result },
          });
        }
        throw new PublishingJobExecutionError(error);
      }
    } catch (error) {
      if (error instanceof PublishingJobExecutionError) {
        throw error;
      }
      const message = isPublishingError(error)
        ? error.message
        : error instanceof Error
          ? error.message
          : "Mirotech publish failed";
      result = { ok: false, error: message };
      await recordAuditSafely({
        context,
        actor: parsed.actor,
        action: "publishing.failed",
        resource,
        metadata: { target: parsed.target, error: message, jobId: job.id },
      });
      if (provider) {
        await provider.update(job.id, {
          payload: { ...job.payload, result },
        });
      }
      throw new PublishingJobExecutionError(message);
    }

    if (provider) {
      await provider.update(job.id, {
        payload: { ...job.payload, result },
      });
    }
  };
}

export const runPublishingMirotechJournalSyncJob = createPublishingMirotechJournalSyncHandler();
