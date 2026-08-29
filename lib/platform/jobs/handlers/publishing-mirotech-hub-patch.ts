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
import { finalizeProjectPublishFailure, finalizeProjectPublishSuccess } from "@/lib/platform/projects/finalize-project-publish";
import { loadProjectWorkflowSnapshot } from "@/lib/platform/projects/workflow-snapshot";
import { mirotechCaseStudyPublicPath } from "@/lib/platform/content/integrations/map-mirotech-content";
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

      if (publishResult.outcome === "completed") {
        if (parsed.source.type === "dual-brand-journal" && publishResult.hubBlog) {
          result = {
            ok: true,
            resourceId: publishResult.resourceId ?? parsed.source.id,
            hubBlog: publishResult.hubBlog as PublishingJobResult["hubBlog"],
          };
        } else if (parsed.source.type === "dual-brand-work" && publishResult.hubProject) {
          result = {
            ok: true,
            resourceId: publishResult.resourceId ?? parsed.source.id,
            hubProject: publishResult.hubProject as Record<string, unknown>,
          };
        } else {
          const error =
            parsed.source.type === "dual-brand-journal"
              ? "Hub journal publish completed without hubBlog result."
              : "Hub patch publish completed without hubProject result.";
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

        if (
          parsed.workflowRef &&
          String(parsed.hubPatch.status ?? "").toUpperCase() === "PUBLISHED"
        ) {
          const snapshot = await loadProjectWorkflowSnapshot(parsed.workflowRef);
          const slug = String(snapshot.snapshot.slug ?? "");
          const publicPath = slug ? mirotechCaseStudyPublicPath(slug) : null;
          const heroKey =
            typeof snapshot.snapshot.heroImage === "string" ? snapshot.snapshot.heroImage : null;
          await finalizeProjectPublishSuccess({
            context,
            actor: parsed.actor,
            ref: parsed.workflowRef,
            publicPath,
            snapshot: {
              title: String(snapshot.snapshot.title ?? ""),
              slug,
              heroKey,
              summary:
                typeof snapshot.snapshot.summary === "string" ? snapshot.snapshot.summary : null,
            },
            jobId: job.id,
          });
          result.publicPath = publicPath;
        }
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
        if (parsed.workflowRef && String(parsed.hubPatch.status ?? "").toUpperCase() === "PUBLISHED") {
          await finalizeProjectPublishFailure({
            context,
            actor: parsed.actor,
            ref: parsed.workflowRef,
            error,
            jobId: job.id,
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
      if (
        parsed.workflowRef &&
        String(parsed.hubPatch.status ?? "").toUpperCase() === "PUBLISHED"
      ) {
        await finalizeProjectPublishFailure({
          context,
          actor: parsed.actor,
          ref: parsed.workflowRef,
          error: message,
          jobId: job.id,
        });
      }
      throw new PublishingJobExecutionError(message);
    }

    await storePublishingJobResult(provider, job, result);
  };
}

export const runPublishingMirotechHubPatchJob = createPublishingMirotechHubPatchHandler();
