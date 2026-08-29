import "server-only";

import type { PlatformContext } from "@/lib/platform/context/types";
import {
  PublishingNotFoundError,
  PublishingTargetError,
  PublishingValidationError,
} from "@/lib/platform/publishing/errors";
import { mapBrightlineWorkProjectPublishResult } from "@/lib/platform/publishing/integrations/map-brightline-publish-result";
import type { PublishingProvider } from "@/lib/platform/publishing/publishing-provider";
import type { PublishRequest, PublishResult } from "@/lib/platform/publishing/types";
import { assertProjectPublishMediaValid } from "@/lib/platform/projects/validate-publish-media";
import { brightlineWorkProjectPublicPath } from "@/lib/platform/content/integrations/map-brightline-content";
import { revalidatePublicChrome } from "@/lib/revalidate-public-chrome";
import { prisma } from "@/lib/prisma";
import { getSectionToPillarSlugMap } from "@/lib/work-pillar-settings";
import { revalidatePath } from "next/cache";

/**
 * Brightline-site publishing adapter (Phase 22E).
 * Publishes work-project rows to the public Brightline site.
 */
export class BrightlinePublishingAdapter implements PublishingProvider {
  readonly tenant = "brightline" as const;
  readonly kind = "brightline" as const;

  supports(request: PublishRequest): boolean {
    return (
      request.target === "brightline-site" &&
      request.source.tenant === "brightline" &&
      request.source.type === "work-project" &&
      (request.operation === "publish" || request.operation === "sync")
    );
  }

  async publish(context: PlatformContext, request: PublishRequest): Promise<PublishResult> {
    void context;
    if (!this.supports(request)) {
      throw new PublishingTargetError(
        `Unsupported Brightline publish request: ${request.source.tenant}/${request.source.type}.`
      );
    }

    const ref = request.source;
    await assertProjectPublishMediaValid(ref);

    const project = await prisma.workProject.findUnique({
      where: { id: ref.id },
      include: {
        heroMedia: true,
        media: { include: { media: true } },
      },
    });
    if (!project) {
      throw new PublishingNotFoundError(`Work project not found: ${ref.id}`);
    }

    const sectionToPillar = await getSectionToPillarSlugMap();
    const pillarSlug = sectionToPillar[project.section] ?? project.section.toLowerCase();
    const publicPath = brightlineWorkProjectPublicPath(pillarSlug, project.slug);

    const publishedAt = project.publishedAt ?? new Date();
    await prisma.workProject.update({
      where: { id: ref.id },
      data: {
        published: true,
        publishedAt: project.published ? project.publishedAt ?? publishedAt : publishedAt,
      },
    });

    const verified = await prisma.workProject.findUnique({
      where: { id: ref.id },
      select: { published: true, slug: true, section: true },
    });
    if (!verified?.published) {
      throw new PublishingValidationError("Publish verification failed: project is not marked published.");
    }

    const revalidatedPaths = [
      `/work/${pillarSlug}/${project.slug}`,
      "/work",
      "/sitemap.xml",
    ];
    revalidatePath(`/work/${pillarSlug}/${project.slug}`, "page");
    revalidatePath("/work", "page");
    revalidatePath("/sitemap.xml");
    revalidatePublicChrome();

    return mapBrightlineWorkProjectPublishResult(request, {
      resourceId: ref.id,
      publicPath,
      revalidatedPaths,
    });
  }
}

export const brightlinePublishingAdapter = new BrightlinePublishingAdapter();
