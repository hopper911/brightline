import "server-only";

import type { HubJournalPost, HubJournalSummary, HubProject } from "@/lib/dual-brand/studio-hub";
import type { PlatformAuditActor } from "@/lib/platform/audit/types";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import type { DefaultJobService } from "@/lib/platform/jobs/default-job-service";
import { defaultJobService } from "@/lib/platform/jobs/default-job-service";
import { enqueueMirotechHubPatchJob } from "@/lib/platform/jobs/publishing-enqueue";
import { readPublishingJobResult } from "@/lib/platform/jobs/publishing-payload";
import type { AsyncPublishAccepted } from "@/lib/platform/publishing/async-publish-types";

const MIROTECH_TARGET = "mirotech-site" as const;

async function resolveCachedHubPatchJob(
  jobService: DefaultJobService,
  jobId: string
): Promise<ReturnType<typeof readPublishingJobResult>> {
  const context = createPlatformContextForTenant("mirotech");
  const existing = await jobService.getStatus(context, jobId);
  if (existing?.status !== "COMPLETED") return null;
  const cached = readPublishingJobResult(existing.payload);
  if (!cached?.ok) return null;
  return cached;
}

/**
 * Enqueue Studio Hub project PATCH (fire-and-forget).
 * Returns cached hubProject when idempotent job already completed.
 */
export async function enqueueStudioHubProjectPatchJob(
  id: string,
  payload: Record<string, unknown>,
  options?: {
    jobService?: DefaultJobService;
    actor?: PlatformAuditActor;
  }
): Promise<AsyncPublishAccepted | HubProject> {
  const jobService = options?.jobService ?? defaultJobService;
  const context = createPlatformContextForTenant("mirotech");
  const actor = options?.actor ?? { type: "USER" as const };
  const source = { tenant: "mirotech" as const, type: "dual-brand-work" as const, id };

  const enqueued = await enqueueMirotechHubPatchJob({
    context,
    source,
    target: MIROTECH_TARGET,
    operation: "sync",
    hubPatch: payload,
    actor,
    jobService,
  });

  if (enqueued.reused) {
    const cached = await resolveCachedHubPatchJob(jobService, enqueued.jobId);
    if (cached?.hubProject) {
      return cached.hubProject as unknown as HubProject;
    }
  }

  return { accepted: true, jobId: enqueued.jobId, reused: enqueued.reused };
}

/**
 * Enqueue Studio Hub journal PATCH (fire-and-forget).
 * Returns cached hubBlog when idempotent job already completed.
 */
export async function enqueueStudioHubBlogPatchJob(
  projectId: string,
  payload: Record<string, unknown>,
  options?: {
    jobService?: DefaultJobService;
    actor?: PlatformAuditActor;
  }
): Promise<
  AsyncPublishAccepted | { post: HubJournalPost; summary: HubJournalSummary }
> {
  const jobService = options?.jobService ?? defaultJobService;
  const context = createPlatformContextForTenant("mirotech");
  const actor = options?.actor ?? { type: "USER" as const };
  const source = { tenant: "mirotech" as const, type: "dual-brand-journal" as const, id: projectId };

  const enqueued = await enqueueMirotechHubPatchJob({
    context,
    source,
    target: MIROTECH_TARGET,
    operation: "sync",
    hubPatch: payload,
    actor,
    jobService,
  });

  if (enqueued.reused) {
    const cached = await resolveCachedHubPatchJob(jobService, enqueued.jobId);
    if (cached?.hubBlog) {
      return {
        post: cached.hubBlog.post as unknown as HubJournalPost,
        summary: cached.hubBlog.summary as unknown as HubJournalSummary,
      };
    }
  }

  return { accepted: true, jobId: enqueued.jobId, reused: enqueued.reused };
}
