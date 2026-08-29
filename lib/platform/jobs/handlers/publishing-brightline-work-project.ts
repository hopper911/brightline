import "server-only";

import { recordAuditSafely } from "@/lib/platform/audit/record-safely";
import type { PlatformContext } from "@/lib/platform/context/types";
import { PublishingJobExecutionError } from "@/lib/platform/jobs/handlers/publishing-job-errors";
import type { JobHandler } from "@/lib/platform/jobs/job-handler-registry";
import type { JobProvider } from "@/lib/platform/jobs/job-provider";
import {
  parsePublishingBrightlineWorkProjectPayload,
  type PublishingJobResult,
} from "@/lib/platform/jobs/publishing-payload";
import type { JobRecord } from "@/lib/platform/jobs/types";
import {
  finalizeProjectPublishFailure,
  finalizeProjectPublishSuccess,
} from "@/lib/platform/projects/finalize-project-publish";
import { loadProjectWorkflowSnapshot } from "@/lib/platform/projects/workflow-snapshot";
import { defaultPublishingService } from "@/lib/platform/publishing/default-publishing-service";
import type { DefaultPublishingService } from "@/lib/platform/publishing/default-publishing-service";
import { isPublishingError } from "@/lib/platform/publishing/errors";
import { brightlineWorkProjectPublicPath } from "@/lib/platform/content/integrations/map-brightline-content";
import { getSectionToPillarSlugMap } from "@/lib/work-pillar-settings";
import { prisma } from "@/lib/prisma";

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

async function resolveBrightlinePublicPath(projectId: string): Promise<string | null> {
  const project = await prisma.workProject.findUnique({
    where: { id: projectId },
    select: { slug: true, section: true },
  });
  if (!project) return null;
  const sectionToPillar = await getSectionToPillarSlugMap();
  const pillarSlug = sectionToPillar[project.section] ?? project.section.toLowerCase();
  return brightlineWorkProjectPublicPath(pillarSlug, project.slug);
}

/**
 * Worker handler — Brightline work project publish (Phase 22E).
 */
export function createPublishingBrightlineWorkProjectHandler(
  publishingService: DefaultPublishingService = defaultPublishingService,
  provider?: JobProvider
): JobHandler {
  return async (context: PlatformContext, job: JobRecord) => {
    const parsed = parsePublishingBrightlineWorkProjectPayload(job.payload);
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

      if (publishResult.outcome !== "completed") {
        const error = publishResult.message || "Brightline work project publish failed";
        result = { ok: false, error };
        await finalizeProjectPublishFailure({
          context,
          actor: parsed.actor,
          ref: parsed.workflowRef,
          error,
          jobId: job.id,
        });
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

      const publicPath = await resolveBrightlinePublicPath(parsed.source.id);
      const snapshot = await loadProjectWorkflowSnapshot(parsed.workflowRef);
      const heroKey =
        typeof snapshot.snapshot.heroKeyFull === "string"
          ? snapshot.snapshot.heroKeyFull
          : null;

      await finalizeProjectPublishSuccess({
        context,
        actor: parsed.actor,
        ref: parsed.workflowRef,
        publicPath,
        snapshot: {
          title: String(snapshot.snapshot.title ?? ""),
          slug: String(snapshot.snapshot.slug ?? ""),
          heroKey,
          summary:
            typeof snapshot.snapshot.summary === "string" ? snapshot.snapshot.summary : null,
        },
        jobId: job.id,
      });

      result = {
        ok: true,
        resourceId: publishResult.resourceId ?? parsed.source.id,
        publicPath,
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
          publicPath,
        },
      });
    } catch (error) {
      if (error instanceof PublishingJobExecutionError) {
        throw error;
      }
      const message = isPublishingError(error)
        ? error.message
        : error instanceof Error
          ? error.message
          : "Brightline work project publish failed";
      result = { ok: false, error: message };
      await finalizeProjectPublishFailure({
        context,
        actor: parsed.actor,
        ref: parsed.workflowRef,
        error: message,
        jobId: job.id,
      });
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

export const runPublishingBrightlineWorkProjectJob = createPublishingBrightlineWorkProjectHandler();
