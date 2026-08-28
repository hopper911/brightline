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
import { mapHubBlogWriteToPublishResult, mapHubProjectWriteToPublishResult } from "@/lib/platform/publishing/integrations/map-hub-publish-result";
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
 * Mirotech-site publishing adapter (Phase 6B/6D).
 *
 * Delegates to Mirotech domain layer (`lib/platform/publishing/mirotech/*`).
 * Audit for admin cutovers: integration modules (blog-mirotech-sync, studio-hub-publish).
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
    if (request.source.tenant === "brightline" && request.source.type === "blog-post") {
      return true;
    }
    if (
      request.source.tenant === "mirotech" &&
      (request.source.type === "dual-brand-work" || request.source.type === "dual-brand-journal") &&
      request.hubPatch &&
      Object.keys(request.hubPatch).length > 0
    ) {
      return true;
    }
    return false;
  }

  async publish(context: PlatformContext, request: PublishRequest): Promise<PublishResult> {
    void context;
    if (!this.supports(request)) {
      throw new PublishingTargetError(
        `Unsupported Mirotech publish request: ${request.source.tenant}/${request.source.type}.`
      );
    }

    if (!this.writePort.isJournalSyncConfigured()) {
      throw new PublishingNotConfiguredError(
        "Mirotech remote publish is not configured (CONTENT_API_SECRET or handoff secret missing)."
      );
    }

    if (request.source.type === "blog-post") {
      return this.publishBlogPost(request);
    }
    if (request.source.type === "dual-brand-work") {
      return this.publishHubProject(request);
    }
    return this.publishHubBlog(request);
  }

  private async publishBlogPost(request: PublishRequest): Promise<PublishResult> {
    const post = await this.readPort.getBlogPostById(request.source.id);
    if (!post) {
      throw new PublishingNotFoundError(`Blog post not found: ${request.source.id}`);
    }

    const payload = this.postForOperation(post, request.operation);
    this.validateBlogOperation(request.operation, payload);

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

  private async publishHubProject(request: PublishRequest): Promise<PublishResult> {
    if (!request.hubPatch) {
      throw new PublishingValidationError("Hub project publish requires hubPatch payload.");
    }
    try {
      const project = await this.writePort.updateHubProject(request.source.id, request.hubPatch);
      return mapHubProjectWriteToPublishResult(request, project);
    } catch (error) {
      throw new PublishingExecutionError(
        error instanceof Error ? error.message : "Mirotech hub project publish failed.",
        error
      );
    }
  }

  private async publishHubBlog(request: PublishRequest): Promise<PublishResult> {
    if (!request.hubPatch) {
      throw new PublishingValidationError("Hub journal publish requires hubPatch payload.");
    }
    try {
      const blog = await this.writePort.updateHubBlog(request.source.id, request.hubPatch);
      return mapHubBlogWriteToPublishResult(request, blog);
    } catch (error) {
      throw new PublishingExecutionError(
        error instanceof Error ? error.message : "Mirotech hub journal publish failed.",
        error
      );
    }
  }

  private postForOperation(post: BlogPost, operation: PublishOperation): BlogPost {
    if (operation === "unpublish") {
      return { ...post, publishToMirotech: false };
    }
    return post;
  }

  private validateBlogOperation(operation: PublishOperation, post: BlogPost): void {
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
