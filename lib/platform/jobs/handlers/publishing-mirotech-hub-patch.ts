import "server-only";

import { recordAuditSafely } from "@/lib/platform/audit/record-safely";
import type { PlatformContext } from "@/lib/platform/context/types";
import { PublishingJobExecutionError } from "@/lib/platform/jobs/handlers/publishing-job-errors";
import type { JobHandler } from "@/lib/platform/jobs/job-handler-registry";
import type { JobProvider } from "@/lib/platform/jobs/job-provider";
import {
  parsePublishingMirotechHubPatchPayload,
  type PublishingJobResult,
} from "@/lib/platform/jobs/publishing-payload";
import type { JobRecord } from "@/lib/platform/jobs/types";
import { defaultPublishingService } from "@/lib/platform/publishing/default-publishing-service";
import type { DefaultPublishingService } from "@/lib/platform/publishing/default-publishing-service";
import { isPublishingError } from "@/lib/platform/publishing/errors";

async function storePublishingJobResult(
  provider: JobProvider | undefined,
  job: JobRecord,
  result: PublishingJobResult
): Promise<void> {
  if (!provider) return;
  await provider.update(job.id, {
    payload: { ...job.payload, result },
  });
}

/**
 * Worker handler — Mirotech Studio Hub project PATCH (Phase 7C).
 * Uses hubPatch from job payload; idempotent via contentVersion hash.
 */
export function createPublishingMirotechHubPatchHandler(
  publishingService: DefaultPublishingService = defaultPublishingService,
  provider?: JobProvider
): JobHandler {
  return async (context: PlatformContext, job: JobRecord) => {
    const parsed = parsePublishingMirotechHubPatchPayload(job.payload);
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
        hubPatch: parsed.hubPatch,
      });

      if (publishResult.outcome === "completed" && publishResult.hubProject) {
        result = {
          ok: true,
          resourceId: publishResult.resourceId ?? parsed.source.id,
          hubProject: publishResult.hubProject as Record<string, unknown>,
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
        const error = publishResult.message || "Hub patch publish failed";
        result = { ok: false, error };
        await recordAuditSafely({
          context,
          actor: parsed.actor,
          action: "publishing.failed",
          resource,
          metadata: { target: parsed.target, error, jobId: job.id },
        });
        await storePublishingJobResult(provider, job, result);
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
          : "Hub patch publish failed";
      result = { ok: false, error: message };
      await recordAuditSafely({
        context,
        actor: parsed.actor,
        action: "publishing.failed",
        resource,
        metadata: { target: parsed.target, error: message, jobId: job.id },
      });
      await storePublishingJobResult(provider, job, result);
      throw new PublishingJobExecutionError(message);
    }

    await storePublishingJobResult(provider, job, result);
  };
}

export const runPublishingMirotechHubPatchJob = createPublishingMirotechHubPatchHandler();
