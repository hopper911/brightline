import "server-only";

import { getBlogPostById } from "@/lib/blog-posts";
import type { PlatformAuditActor } from "@/lib/platform/audit/types";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import { JobInvalidStateError, JobNotFoundError } from "@/lib/platform/jobs/errors";
import { defaultJobService } from "@/lib/platform/jobs/default-job-service";
import { findPlatformJobById } from "@/lib/platform/jobs/repository";
import { enqueueMirotechJournalSyncJob } from "@/lib/platform/jobs/publishing-enqueue";
import { isPlatformPublishingJobsAsync } from "@/lib/platform/publishing/is-async-publishing-jobs";
import { defaultPublishingService } from "@/lib/platform/publishing/default-publishing-service";
import { recordAuditSafely } from "@/lib/platform/audit/record-safely";
import type { TenantSlug } from "@/lib/platform/tenants/types";
import { toStudioPublishingJobView } from "@/lib/studio/publishing/sanitize-job";

const MIROTECH_TARGET = "mirotech-site" as const;

export type StudioPublishActionResult =
  | { ok: true; jobId?: string; outcome?: string; message?: string }
  | { ok: false; error: string; code?: string };

export async function retryStudioPublishingJob(input: {
  tenant: TenantSlug;
  jobId: string;
  actor: PlatformAuditActor;
}): Promise<StudioPublishActionResult> {
  if (!isPlatformFeatureEnabled("jobs")) {
    return { ok: false, error: "Platform jobs disabled.", code: "disabled" };
  }

  const record = await findPlatformJobById(input.jobId.trim());
  if (!record || record.tenantSlug !== input.tenant) {
    return { ok: false, error: "Job not found.", code: "not_found" };
  }
  if (!record.type.startsWith("publishing.")) {
    return { ok: false, error: "Not a publishing job.", code: "unsupported" };
  }
  if (record.status !== "FAILED") {
    return { ok: false, error: "Only failed jobs can be retried.", code: "invalid_state" };
  }

  const context = createPlatformContextForTenant(input.tenant);
  await recordAuditSafely({
    context,
    actor: input.actor,
    action: "publishing.started",
    resource: { type: "job", id: record.id },
    metadata: { retry: true, jobType: record.type },
  });

  try {
    const final = await defaultJobService.runJob(context, record.id);
    const view = toStudioPublishingJobView(final);
    if (final.status === "COMPLETED") {
      await recordAuditSafely({
        context,
        actor: input.actor,
        action: "publishing.completed",
        resource: { type: "job", id: record.id },
        metadata: { retry: true, jobType: record.type },
      });
      return { ok: true, jobId: record.id, outcome: "completed" };
    }
    return {
      ok: false,
      error: view.errorSummary || view.result?.error || "Retry failed.",
      code: "failed",
    };
  } catch (error) {
    const message =
      error instanceof JobInvalidStateError || error instanceof JobNotFoundError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Retry failed.";
    return { ok: false, error: message, code: "failed" };
  }
}

/** Sync one Brightline blog post to Mirotech via PublishingService or job enqueue. */
export async function studioSyncBlogPostToMirotech(input: {
  postId: string;
  actor: PlatformAuditActor;
}): Promise<StudioPublishActionResult> {
  if (!isPlatformFeatureEnabled("publishing")) {
    return { ok: false, error: "Publishing disabled.", code: "disabled" };
  }

  const post = await getBlogPostById(input.postId.trim());
  if (!post) {
    return { ok: false, error: "Blog post not found.", code: "not_found" };
  }

  const context = createPlatformContextForTenant("brightline");
  const source = { tenant: "brightline" as const, type: "blog-post" as const, id: post.id };

  if (isPlatformPublishingJobsAsync()) {
    const contentVersion = post.updatedAt || post.createdAt || new Date().toISOString();
    const enqueued = await enqueueMirotechJournalSyncJob({
      context,
      source,
      target: MIROTECH_TARGET,
      operation: "sync",
      contentVersion,
      actor: input.actor,
    });
    return {
      ok: true,
      jobId: enqueued.jobId,
      outcome: "accepted",
      message: enqueued.reused ? "Existing job reused." : "Publish job queued.",
    };
  }

  await recordAuditSafely({
    context,
    actor: input.actor,
    action: "publishing.started",
    resource: { type: source.type, id: source.id },
    metadata: { target: MIROTECH_TARGET, operation: "sync", studio: true },
  });

  const result = await defaultPublishingService.publish(context, {
    source,
    target: MIROTECH_TARGET,
    operation: "sync",
  });

  if (result.outcome === "completed") {
    await recordAuditSafely({
      context,
      actor: input.actor,
      action: "publishing.completed",
      resource: { type: source.type, id: source.id },
      metadata: { target: MIROTECH_TARGET, resourceId: result.resourceId ?? null },
    });
    return { ok: true, outcome: "completed", message: result.message };
  }

  await recordAuditSafely({
    context,
    actor: input.actor,
    action: "publishing.failed",
    resource: { type: source.type, id: source.id },
    metadata: { target: MIROTECH_TARGET, error: result.message ?? "Publish failed" },
  });
  return { ok: false, error: result.message || "Publish failed.", code: "failed" };
}
