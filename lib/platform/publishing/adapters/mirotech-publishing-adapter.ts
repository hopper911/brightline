import "server-only";

import type { BlogPost } from "@/lib/blog-post-model";
import type { PlatformContext } from "@/lib/platform/context/types";
import {
  PublishingExecutionError,
  PublishingNotConfiguredError,
  PublishingNotFoundError,
  PublishingTargetError,
  PublishingValidationError,
} from "@/lib/platform/publishing/errors";
import { mapMirotechJournalSyncToPublishResult } from "@/lib/platform/publishing/integrations/map-mirotech-publish-result";
import type {
  MirotechPublishingReadPort,
  MirotechPublishingWritePort,
} from "@/lib/platform/publishing/integrations/mirotech-publishing-port";
import {
  defaultMirotechPublishingReadPort,
  defaultMirotechPublishingWritePort,
} from "@/lib/platform/publishing/integrations/default-mirotech-publishing-port";
import type { PublishingProvider } from "@/lib/platform/publishing/publishing-provider";
import type { PublishOperation, PublishRequest, PublishResult } from "@/lib/platform/publishing/types";

/**
 * Mirotech-site publishing adapter (Phase 6B).
 *
 * Wraps `syncBlogPostToMirotech` for Brightline blog-post → Mirotech journal ingest.
 * Idempotency: **partially safe** — ingest upserts by `brightlinePostId` / `mirotechJournalId`.
 * Audit: emitted by `blog-mirotech-sync` integration when PLATFORM_PUBLISHING_ENABLED (not here).
 *
 * Authorization: caller must verify admin/automation auth before invoking PublishingService.
 */
export class MirotechPublishingAdapter implements PublishingProvider {
  readonly tenant = "mirotech" as const;
  readonly kind = "mirotech" as const;

  constructor(
    private readonly readPort: MirotechPublishingReadPort = defaultMirotechPublishingReadPort,
    private readonly writePort: MirotechPublishingWritePort = defaultMirotechPublishingWritePort
  ) {}

  supports(request: PublishRequest): boolean {
    if (request.target !== "mirotech-site") return false;
    return request.source.tenant === "brightline" && request.source.type === "blog-post";
  }

  async publish(context: PlatformContext, request: PublishRequest): Promise<PublishResult> {
    void context;
    this.assertSupported(request);

    if (!this.writePort.isJournalSyncConfigured()) {
      throw new PublishingNotConfiguredError(
        "Mirotech journal sync is not configured (CONTENT_API_SECRET or handoff secret missing)."
      );
    }

    const post = await this.readPort.getBlogPostById(request.source.id);
    if (!post) {
      throw new PublishingNotFoundError(`Blog post not found: ${request.source.id}`);
    }

    const payload = this.postForOperation(post, request.operation);
    this.validateOperation(request.operation, payload);

    try {
      const sync = await this.writePort.syncBlogPostToMirotech(payload);
      return mapMirotechJournalSyncToPublishResult(request, sync);
    } catch (error) {
      throw new PublishingExecutionError(
        error instanceof Error ? error.message : "Mirotech journal sync failed.",
        error
      );
    }
  }

  private assertSupported(request: PublishRequest): void {
    if (request.target !== "mirotech-site") {
      throw new PublishingTargetError(`Adapter mirotech-site cannot publish to "${request.target}".`);
    }
    if (request.source.tenant !== "brightline" || request.source.type !== "blog-post") {
      throw new PublishingTargetError(
        `Mirotech journal sync supports brightline blog-post sources only (got ${request.source.tenant}/${request.source.type}).`
      );
    }
  }

  private postForOperation(post: BlogPost, operation: PublishOperation): BlogPost {
    if (operation === "unpublish") {
      return { ...post, publishToMirotech: false };
    }
    return post;
  }

  private validateOperation(operation: PublishOperation, post: BlogPost): void {
    if (operation === "publish" && !post.publishToMirotech) {
      throw new PublishingValidationError(
        "Cannot publish to Mirotech: blog post publishToMirotech is false. Save opt-in first or use sync."
      );
    }
    if (operation === "publish" && post.status !== "PUBLISHED") {
      throw new PublishingValidationError(
        "Cannot publish to Mirotech: blog post status is not PUBLISHED on Brightline."
      );
    }
  }
}

export const mirotechPublishingAdapter = new MirotechPublishingAdapter();
