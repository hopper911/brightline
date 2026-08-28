import "server-only";

import type { BlogPost } from "@/lib/blog-post-model";
import type { MirotechJournalSyncResult } from "@/lib/dual-brand/sync-journal";
import { recordAuditSafely } from "@/lib/platform/audit/record-safely";
import type { PlatformAuditActor } from "@/lib/platform/audit/types";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import type { DefaultJobService } from "@/lib/platform/jobs/default-job-service";
import { defaultJobService } from "@/lib/platform/jobs/default-job-service";
import {
  buildPublishingMirotechJournalIdempotencyKey,
  publishingJobPayload,
  readPublishingJobResult,
} from "@/lib/platform/jobs/publishing-payload";
import { PUBLISHING_MIROTECH_JOURNAL_SYNC_JOB } from "@/lib/platform/jobs/types";
import type { BlogMirotechSyncOutcome } from "@/lib/platform/publishing/integrations/blog-mirotech-sync-types";

const MIROTECH_TARGET = "mirotech-site" as const;

function shouldSyncPost(post: BlogPost): boolean {
  return post.publishToMirotech || Boolean(post.mirotechJournalId);
}

function applySyncSuccess(post: BlogPost, mirotechJournalId: string | undefined): BlogPost {
  return {
    ...post,
    mirotechJournalId: post.publishToMirotech
      ? mirotechJournalId || post.mirotechJournalId || ""
      : "",
  };
}

function syncResultFromJob(postId: string, jobPayload: Record<string, unknown>): MirotechJournalSyncResult {
  const result = readPublishingJobResult(jobPayload);
  if (!result) {
    return { postId, ok: false, error: "Publishing job did not produce a result." };
  }
  if (result.ok) {
    return {
      postId,
      ok: true,
      mirotechJournalId: result.resourceId || "",
    };
  }
  return { postId, ok: false, error: result.error || "Mirotech sync failed" };
}

/**
 * Async publishing path (Phase 7B) — enqueue + inline worker drain for UI compatibility.
 * Requires PLATFORM_JOBS_ENABLED and PLATFORM_PUBLISHING_ENABLED.
 */
export async function jobPlatformSyncBlogPostsMirotech(
  posts: BlogPost[],
  options?: {
    jobService?: DefaultJobService;
    actor?: PlatformAuditActor;
  }
): Promise<BlogMirotechSyncOutcome> {
  const jobService = options?.jobService ?? defaultJobService;
  const context = createPlatformContextForTenant("brightline");
  const actor = options?.actor ?? { type: "USER" };
  const results: MirotechJournalSyncResult[] = [];
  const next = posts.map((p) => ({ ...p }));

  for (let index = 0; index < next.length; index += 1) {
    const post = next[index];
    if (!post || !shouldSyncPost(post)) continue;

    const source = { tenant: "brightline" as const, type: "blog-post" as const, id: post.id };
    const contentVersion = post.updatedAt || post.createdAt || new Date().toISOString();
    const idempotencyKey = buildPublishingMirotechJournalIdempotencyKey({
      source,
      target: MIROTECH_TARGET,
      operation: "sync",
      contentVersion,
    });

    await recordAuditSafely({
      context,
      actor,
      action: "publishing.queued",
      resource: { type: "blog-post", id: post.id },
      metadata: {
        target: MIROTECH_TARGET,
        operation: "sync",
        contentVersion,
        idempotencyKey,
      },
    });

    const enqueued = await jobService.enqueue(context, {
      type: PUBLISHING_MIROTECH_JOURNAL_SYNC_JOB,
      idempotencyKey,
      payload: publishingJobPayload({
        source,
        target: MIROTECH_TARGET,
        operation: "sync",
        contentVersion,
        actor,
      }),
    });

    let finalJob = await jobService.getStatus(context, enqueued.jobId);
    if (!finalJob) {
      results.push({ postId: post.id, ok: false, error: "Publishing job not found after enqueue." });
      continue;
    }

    if (enqueued.reused && finalJob.status === "COMPLETED") {
      const cached = syncResultFromJob(post.id, finalJob.payload as Record<string, unknown>);
      results.push(cached);
      if (cached.ok) {
        next[index] = applySyncSuccess(post, cached.mirotechJournalId);
      }
      continue;
    }

    if (finalJob.status === "PENDING" || finalJob.status === "FAILED") {
      finalJob = await jobService.runJob(context, enqueued.jobId);
    }

    const outcome = syncResultFromJob(post.id, finalJob.payload as Record<string, unknown>);
    results.push(outcome);
    if (outcome.ok) {
      next[index] = applySyncSuccess(post, outcome.mirotechJournalId);
    }
  }

  return { posts: next, results };
}
