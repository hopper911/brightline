import "server-only";

import type { HubProject } from "@/lib/dual-brand/studio-hub";
import { recordAuditSafely } from "@/lib/platform/audit/record-safely";
import type { PlatformAuditActor } from "@/lib/platform/audit/types";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import { awaitPlatformJobs } from "@/lib/platform/jobs/drain-platform-jobs";
import type { DefaultJobService } from "@/lib/platform/jobs/default-job-service";
import { defaultJobService } from "@/lib/platform/jobs/default-job-service";
import {
  buildPublishingMirotechHubPatchIdempotencyKey,
  hashPublishingContentVersion,
  publishingHubPatchJobPayload,
  readPublishingJobResult,
} from "@/lib/platform/jobs/publishing-payload";
import { PUBLISHING_MIROTECH_HUB_PATCH_JOB } from "@/lib/platform/jobs/types";

const MIROTECH_TARGET = "mirotech-site" as const;

/**
 * Async Studio Hub project PATCH (Phase 7C).
 * Enqueues job + drains via shared platform job runner (same path as cron).
 */
export async function jobPlatformPatchStudioHubProject(
  id: string,
  payload: Record<string, unknown>,
  options?: {
    jobService?: DefaultJobService;
    actor?: PlatformAuditActor;
  }
): Promise<HubProject> {
  const jobService = options?.jobService ?? defaultJobService;
  const context = createPlatformContextForTenant("mirotech");
  const actor = options?.actor ?? { type: "USER" };
  const source = { tenant: "mirotech" as const, type: "dual-brand-work" as const, id };
  const contentVersion = hashPublishingContentVersion(payload);
  const idempotencyKey = buildPublishingMirotechHubPatchIdempotencyKey({
    source,
    target: MIROTECH_TARGET,
    operation: "sync",
    contentVersion,
  });

  await recordAuditSafely({
    context,
    actor,
    action: "publishing.queued",
    resource: { type: "dual-brand-work", id },
    metadata: {
      target: MIROTECH_TARGET,
      operation: "sync",
      contentVersion,
      idempotencyKey,
    },
  });

  const enqueued = await jobService.enqueue(context, {
    type: PUBLISHING_MIROTECH_HUB_PATCH_JOB,
    idempotencyKey,
    payload: publishingHubPatchJobPayload({
      source,
      target: MIROTECH_TARGET,
      operation: "sync",
      contentVersion,
      hubPatch: payload,
      actor,
    }),
  });

  if (enqueued.reused) {
    const existing = await jobService.getStatus(context, enqueued.jobId);
    if (existing?.status === "COMPLETED") {
      const cached = readPublishingJobResult(existing.payload);
      if (cached?.ok && cached.hubProject) {
        return cached.hubProject as unknown as HubProject;
      }
    }
  }

  const [finalJob] = await awaitPlatformJobs([enqueued.jobId], { jobService });
  if (!finalJob) {
    throw new Error("Hub patch publishing job not found after enqueue.");
  }

  const outcome = readPublishingJobResult(finalJob.payload);
  if (!outcome?.ok) {
    throw new Error(outcome?.error || finalJob.errorSummary || "Hub project publish failed");
  }
  if (!outcome.hubProject) {
    throw new Error("Hub patch job completed without hubProject result.");
  }

  return outcome.hubProject as unknown as HubProject;
}
