import "server-only";

import type { BlogPost } from "@/lib/blog-post-model";
import type { MirotechJournalSyncResult } from "@/lib/dual-brand/sync-journal";
import { syncBlogPostsToMirotech } from "@/lib/dual-brand/sync-journal";
import { recordAuditSafely } from "@/lib/platform/audit/record-safely";
import type { PlatformAuditActor } from "@/lib/platform/audit/types";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import type { DefaultPublishingService } from "@/lib/platform/publishing/default-publishing-service";
import { defaultPublishingService } from "@/lib/platform/publishing/default-publishing-service";
import { isPublishingError } from "@/lib/platform/publishing/errors";
import { jobPlatformSyncBlogPostsMirotech } from "@/lib/platform/publishing/integrations/blog-mirotech-async-sync";
import type { BlogMirotechSyncOutcome } from "@/lib/platform/publishing/integrations/blog-mirotech-sync-types";

export type { BlogMirotechSyncOutcome } from "@/lib/platform/publishing/integrations/blog-mirotech-sync-types";

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

/** Legacy path — direct batch sync (pre-PublishingService). */
export async function legacySyncBlogPostsMirotech(
  posts: BlogPost[]
): Promise<BlogMirotechSyncOutcome> {
  return syncBlogPostsToMirotech(posts);
}

/** Platform path — PublishingService per eligible post (Phase 6C). */
export async function platformSyncBlogPostsMirotech(
  posts: BlogPost[],
  publishingService: DefaultPublishingService = defaultPublishingService,
  actor: PlatformAuditActor = { type: "SYSTEM" }
): Promise<BlogMirotechSyncOutcome> {
  const context = createPlatformContextForTenant("brightline");
  const results: MirotechJournalSyncResult[] = [];
  const next = posts.map((p) => ({ ...p }));

  await Promise.all(
    next.map(async (post, index) => {
      if (!shouldSyncPost(post)) return;

      const resource = { type: "blog-post", id: post.id };
      await recordAuditSafely({
        context,
        actor,
        action: "publishing.started",
        resource,
        metadata: { target: MIROTECH_TARGET, operation: "sync" },
      });

      try {
        const publishResult = await publishingService.publish(context, {
          source: { tenant: "brightline", type: "blog-post", id: post.id },
          target: MIROTECH_TARGET,
          operation: "sync",
        });

        if (publishResult.outcome === "completed") {
          const journalId = publishResult.resourceId ?? undefined;
          results.push({
            postId: post.id,
            ok: true,
            mirotechJournalId: journalId || post.mirotechJournalId || "",
          });
          next[index] = applySyncSuccess(post, journalId);
          await recordAuditSafely({
            context,
            actor,
            action: "publishing.completed",
            resource,
            metadata: {
              target: MIROTECH_TARGET,
              resourceId: publishResult.resourceId ?? null,
            },
          });
          return;
        }

        const error = publishResult.message || "Mirotech sync failed";
        results.push({ postId: post.id, ok: false, error });
        await recordAuditSafely({
          context,
          actor,
          action: "publishing.failed",
          resource,
          metadata: { target: MIROTECH_TARGET, error },
        });
      } catch (error) {
        const message = isPublishingError(error)
          ? error.message
          : error instanceof Error
            ? error.message
            : "Mirotech sync failed";
        results.push({ postId: post.id, ok: false, error: message });
        await recordAuditSafely({
          context,
          actor,
          action: "publishing.failed",
          resource,
          metadata: { target: MIROTECH_TARGET, error: message },
        });
      }
    })
  );

  return { posts: next, results };
}

/**
 * Blog PATCH Mirotech journal sync (Phase 6C consumer; Phase 7B async when jobs enabled).
 * Flag off → legacy syncBlogPostsToMirotech.
 * Publishing on, jobs off → synchronous PublishingService (6C).
 * Publishing on, jobs on → enqueue + worker drain (7B); response shape unchanged for admin UI.
 */
export async function resolveBlogPostsMirotechSync(
  posts: BlogPost[],
  options?: {
    publishingService?: DefaultPublishingService;
    actor?: PlatformAuditActor;
  }
): Promise<BlogMirotechSyncOutcome> {
  if (!isPlatformFeatureEnabled("publishing")) {
    return legacySyncBlogPostsMirotech(posts);
  }
  if (isPlatformFeatureEnabled("jobs")) {
    return jobPlatformSyncBlogPostsMirotech(posts, { actor: options?.actor });
  }
  return platformSyncBlogPostsMirotech(
    posts,
    options?.publishingService,
    options?.actor ?? { type: "USER" }
  );
}
