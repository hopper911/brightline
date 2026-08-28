import "server-only";

import type { BlogPost } from "@/lib/blog-post-model";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import type { DefaultJobService } from "@/lib/platform/jobs/default-job-service";
import { defaultJobService } from "@/lib/platform/jobs/default-job-service";
import { enqueueMirotechJournalSyncJob } from "@/lib/platform/jobs/publishing-enqueue";
import { readPublishingJobResult } from "@/lib/platform/jobs/publishing-payload";
import type { PlatformAuditActor } from "@/lib/platform/audit/types";
import type {
  BlogMirotechSyncOutcome,
  BlogMirotechSyncResultItem,
} from "@/lib/platform/publishing/integrations/blog-mirotech-sync-types";
import { isAcceptedBlogSyncResult } from "@/lib/platform/publishing/integrations/blog-mirotech-sync-types";

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

function syncResultFromJob(postId: string, jobPayload: Record<string, unknown>): BlogMirotechSyncResultItem {
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
 * Async publishing path — enqueue only (fire-and-forget).
 * Client polls job status; cron drains workers in production.
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
  const results: BlogMirotechSyncResultItem[] = [];
  const next = posts.map((p) => ({ ...p }));

  for (let index = 0; index < next.length; index += 1) {
    const post = next[index];
    if (!post || !shouldSyncPost(post)) continue;

    const source = { tenant: "brightline" as const, type: "blog-post" as const, id: post.id };
    const contentVersion = post.updatedAt || post.createdAt || new Date().toISOString();

    const enqueued = await enqueueMirotechJournalSyncJob({
      context,
      source,
      target: MIROTECH_TARGET,
      operation: "sync",
      contentVersion,
      actor,
      jobService,
    });

    if (enqueued.reused) {
      const existing = await jobService.getStatus(context, enqueued.jobId);
      if (existing?.status === "COMPLETED") {
        const cached = syncResultFromJob(post.id, existing.payload as Record<string, unknown>);
        results.push(cached);
        if (!isAcceptedBlogSyncResult(cached) && cached.ok) {
          next[index] = applySyncSuccess(post, cached.mirotechJournalId);
        }
        continue;
      }
    }

    results.push({ postId: post.id, accepted: true, jobId: enqueued.jobId });
  }

  return { posts: next, results };
}
