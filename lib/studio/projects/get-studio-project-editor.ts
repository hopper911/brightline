import "server-only";

import type { ContentRef } from "@/lib/platform/content/types";
import { getHubProject, type HubProject } from "@/lib/dual-brand/studio-hub";
import { defaultProjectWorkflowService } from "@/lib/platform/projects/server";
import type {
  ProjectCompletenessResult,
  ProjectWorkflowLifecycle,
} from "@/lib/platform/projects/types";
import {
  studioProjectLegacyAdminHref,
  studioProjectPreviewHref,
} from "@/lib/studio/projects/edit-href";
import { lifecycleDisplayLabel } from "@/lib/studio/projects/status-filters";
import { prisma } from "@/lib/prisma";
import { getSectionToPillarSlugMap } from "@/lib/work-pillar-settings";

export type StudioProjectMediaItem = {
  id: string;
  sortOrder: number;
  alt: string | null;
  keyThumb: string | null;
  keyFull: string | null;
  isHero: boolean;
};

export type StudioProjectEditorView = {
  ref: ContentRef;
  tenant: ContentRef["tenant"];
  kind: "work-project" | "mirotech-case-study";
  title: string;
  slug: string;
  lifecycle: ProjectWorkflowLifecycle;
  lifecycleLabel: string;
  completeness: ProjectCompletenessResult;
  updatedAt: string;
  previewHref: string | null;
  legacyAdminHref: string;
  overview: {
    summary: string;
    projectType: string | null;
    status: string;
  };
  content: Record<string, unknown>;
  media: {
    heroMediaId: string | null;
    items: StudioProjectMediaItem[];
    heroImage: string | null;
    thumbnailImage: string | null;
    backgroundMedia: string | null;
    sections: HubProject["sections"];
  };
  details: Record<string, unknown>;
  seo: {
    seoTitle: string | null;
    seoDescription: string | null;
    slug: string;
    publicPathPreview: string | null;
  };
  publishing: {
    published: boolean;
    publishMirotech: boolean;
    publishBrightline: boolean;
    hubStatus: string | null;
  };
};

export async function getStudioProjectEditorView(ref: ContentRef): Promise<StudioProjectEditorView | null> {
  if (ref.type === "work-project" && ref.tenant === "brightline") {
    const project = await prisma.workProject.findUnique({
      where: { id: ref.id },
      include: {
        heroMedia: true,
        media: { include: { media: true }, orderBy: { sortOrder: "asc" } },
      },
    });
    if (!project) return null;

    const sectionToPillar = await getSectionToPillarSlugMap();
    const pillarSlug = sectionToPillar[project.section] ?? null;

    const snapshot = {
      title: project.title,
      slug: project.slug,
      section: project.section,
      summary: project.summary,
      description: project.description,
      heroMediaId: project.heroMediaId,
      mediaCount: project.media.length,
      seoTitle: project.seoTitle,
      metaDescription: project.metaDescription,
      heroKeyFull: project.heroMedia?.keyFull ?? null,
      published: project.published,
    };

    const completeness = defaultProjectWorkflowService.evaluateCompleteness({
      tenant: "brightline",
      kind: "work-project",
      snapshot,
    });
    const lifecycle = defaultProjectWorkflowService.deriveLifecycle({
      tenant: "brightline",
      kind: "work-project",
      snapshot,
    });

    const mediaItems: StudioProjectMediaItem[] = project.media.map((row) => ({
      id: row.mediaId,
      sortOrder: row.sortOrder,
      alt: row.media.alt,
      keyThumb: row.media.keyThumb,
      keyFull: row.media.keyFull,
      isHero: project.heroMediaId === row.mediaId,
    }));

    return {
      ref,
      tenant: "brightline",
      kind: "work-project",
      title: project.title,
      slug: project.slug,
      lifecycle,
      lifecycleLabel: lifecycleDisplayLabel(lifecycle),
      completeness,
      updatedAt: project.updatedAt.toISOString(),
      previewHref: studioProjectPreviewHref("brightline", "work-project", project.id),
      legacyAdminHref: studioProjectLegacyAdminHref("brightline", "work-project", project.id),
      overview: {
        summary: project.summary ?? "",
        projectType: project.projectType,
        status: lifecycleDisplayLabel(lifecycle),
      },
      content: {
        summary: project.summary ?? "",
        description: project.description ?? "",
        opening: project.opening ?? "",
        context: project.context ?? "",
        approach: project.approach ?? "",
        highlight: project.highlight ?? "",
        execution: project.execution ?? "",
        closing: project.closing ?? "",
        credits: project.credits ?? "",
        overviewExtended: project.overviewExtended ?? "",
        whatWasPhotographed: project.whatWasPhotographed ?? "",
        visualApproach: project.visualApproach ?? "",
        locationContext: project.locationContext ?? "",
        whoIsThisFor: project.whoIsThisFor ?? "",
      },
      media: {
        heroMediaId: project.heroMediaId,
        items: mediaItems,
        heroImage: null,
        thumbnailImage: null,
        backgroundMedia: project.backgroundMediaUrl,
        sections: undefined,
      },
      details: {
        title: project.title,
        slug: project.slug,
        pillarSlug,
        section: project.section,
        location: project.location ?? "",
        year: project.year,
        client: project.client ?? "",
        projectType: project.projectType ?? "",
        scope: project.scope ?? "",
        isFeatured: project.isFeatured,
        sortOrder: project.sortOrder,
      },
      seo: {
        seoTitle: project.seoTitle,
        seoDescription: project.metaDescription,
        slug: project.slug,
        publicPathPreview: project.published
          ? `/work/${project.section.toLowerCase()}/${project.slug}`
          : null,
      },
      publishing: {
        published: project.published,
        publishMirotech: false,
        publishBrightline: false,
        hubStatus: null,
      },
    };
  }

  if (ref.type === "mirotech-case-study" && ref.tenant === "mirotech") {
    const project = await getHubProject(ref.id);
    if (!project) return null;

    const snapshot = {
      title: project.title,
      slug: project.slug,
      summary: project.summary ?? "",
      status: project.status ?? "DRAFT",
      heroImage: project.heroImage ?? null,
      thumbnailImage: project.thumbnailImage ?? null,
      sectionCount: project.sections?.length ?? 0,
      challenge: project.challenge ?? null,
      outcome: project.outcome ?? null,
      seoTitle: project.seoTitle ?? null,
      seoDescription: project.seoDescription ?? null,
      publishMirotech: project.publishMirotech ?? false,
    };

    const completeness = defaultProjectWorkflowService.evaluateCompleteness({
      tenant: "mirotech",
      kind: "mirotech-case-study",
      snapshot,
    });
    const lifecycle = defaultProjectWorkflowService.deriveLifecycle({
      tenant: "mirotech",
      kind: "mirotech-case-study",
      snapshot,
    });

    return {
      ref,
      tenant: "mirotech",
      kind: "mirotech-case-study",
      title: project.title,
      slug: project.slug,
      lifecycle,
      lifecycleLabel: lifecycleDisplayLabel(lifecycle),
      completeness,
      updatedAt:
        typeof project.updatedAt === "string"
          ? project.updatedAt
          : new Date().toISOString(),
      previewHref: studioProjectPreviewHref("mirotech", "mirotech-case-study", project.id),
      legacyAdminHref: studioProjectLegacyAdminHref("mirotech", "mirotech-case-study", project.id),
      overview: {
        summary: project.summary ?? "",
        projectType: project.projectType ?? null,
        status: project.status ?? "DRAFT",
      },
      content: {
        summary: project.summary ?? "",
        challenge: project.challenge ?? "",
        outcome: project.outcome ?? "",
        role: project.role ?? "",
        duration: project.duration ?? "",
        whatsNext: project.whatsNext ?? "",
        projectDisclaimer: project.projectDisclaimer ?? "",
        photoNarrative: project.photoNarrative ?? {},
        sections: project.sections ?? [],
      },
      media: {
        heroMediaId: null,
        items: [],
        heroImage: project.heroImage ?? null,
        thumbnailImage: project.thumbnailImage ?? null,
        backgroundMedia: project.backgroundMedia ?? null,
        sections: project.sections ?? [],
      },
      details: {
        title: project.title,
        slug: project.slug,
        year: project.year,
        status: project.status ?? "DRAFT",
        projectType: project.projectType ?? "",
        clientType: project.clientType ?? "",
        categories: project.categories ?? [],
        disciplines: project.disciplines ?? [],
        tools: project.tools ?? [],
        platforms: project.platforms ?? [],
      },
      seo: {
        seoTitle: project.seoTitle ?? null,
        seoDescription: project.seoDescription ?? null,
        slug: project.slug,
        publicPathPreview: null,
      },
      publishing: {
        published: String(project.status).toUpperCase() === "PUBLISHED",
        publishMirotech: project.publishMirotech ?? false,
        publishBrightline: project.publishBrightline ?? false,
        hubStatus: project.status ?? "DRAFT",
      },
    };
  }

  return null;
}
