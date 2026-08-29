import "server-only";

import type { WorkSection } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getPillarBySlug,
  getPrimaryWorkSection,
} from "@/lib/work-pillar-settings";
import { WORK_SECTIONS } from "@/lib/portfolioPillars";
import { resolveProjectSlug } from "@/lib/platform/projects/slug";
import { ProjectWorkflowValidationError } from "@/lib/platform/projects/errors";
import type { ProjectWorkflowCreateInput } from "@/lib/platform/projects/types";

export type BrightlineWorkProjectCreateResult = {
  id: string;
  slug: string;
  section: WorkSection;
  title: string;
  summary: string | null;
  description: string | null;
  heroMediaId: string | null;
  mediaCount: number;
  seoTitle: string | null;
  metaDescription: string | null;
  published: boolean;
};

export async function createBrightlineWorkProjectDraft(
  input: ProjectWorkflowCreateInput,
  templateDefaults: Record<string, unknown> = {}
): Promise<BrightlineWorkProjectCreateResult> {
  const title = input.title?.trim();
  if (!title) {
    throw new ProjectWorkflowValidationError("title is required.");
  }

  const pillarSlug =
    (input.pillarSlug?.trim() || (templateDefaults.pillarSlug as string | undefined)?.trim()) ??
    "";
  let section: WorkSection;

  if (pillarSlug) {
    const pillar = await getPillarBySlug(pillarSlug.toLowerCase());
    if (!pillar) {
      throw new ProjectWorkflowValidationError(
        `Unknown pillar slug "${pillarSlug}". Configure under Admin → Work pillars.`
      );
    }
    section = getPrimaryWorkSection(pillar);
  } else if (input.section && WORK_SECTIONS.includes(input.section as WorkSection)) {
    section = input.section as WorkSection;
  } else {
    throw new ProjectWorkflowValidationError("pillarSlug or valid work section is required.");
  }

  const conflictPolicy = input.slugConflictPolicy ?? "reject";
  const { slug } = await resolveProjectSlug({
    title,
    slugInput: input.slug,
    conflictPolicy,
    isTaken: async (candidate) => {
      const existing = await prisma.workProject.findFirst({
        where: { section, slug: { equals: candidate, mode: "insensitive" } },
        select: { id: true },
      });
      return Boolean(existing);
    },
  });

  const summary =
    input.summary?.trim() ||
    (typeof templateDefaults.summary === "string" ? templateDefaults.summary : "") ||
    null;

  const project = await prisma.workProject.create({
    data: {
      section,
      title,
      slug,
      summary,
      published: false,
      isFeatured: false,
      sortOrder: 0,
    },
    include: {
      heroMedia: true,
      media: true,
    },
  });

  return {
    id: project.id,
    slug: project.slug,
    section: project.section,
    title: project.title,
    summary: project.summary,
    description: project.description,
    heroMediaId: project.heroMediaId,
    mediaCount: project.media.length,
    seoTitle: project.seoTitle,
    metaDescription: project.metaDescription,
    published: project.published,
  };
}
