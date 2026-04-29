import type { WorkSection } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { WORK_SECTIONS } from "@/lib/portfolioPillars";
import {
  getPillarBySlug,
  getPrimaryWorkSection,
  sectionToPillarSlug as mapWorkSectionToPillarSlug,
} from "@/lib/work-pillar-settings";
import { slugify } from "@/lib/slugify";

async function resolveSection(input: {
  pillar?: string;
  section?: string;
}): Promise<WorkSection | null> {
  const pillarKey = input.pillar?.trim().toLowerCase();
  if (pillarKey) {
    const pillar = await getPillarBySlug(pillarKey);
    if (pillar) return getPrimaryWorkSection(pillar);
  }
  if (input.section && WORK_SECTIONS.includes(input.section as WorkSection)) {
    return input.section as WorkSection;
  }
  return null;
}

export type CreateStudioProjectBody = {
  pillar?: string;
  section?: string;
  title: string;
  slug?: string;
  client?: string | null;
  /** Maps to `projectType` (category label). */
  category?: string | null;
  location?: string | null;
  year?: number | null;
  opening?: string | null;
  context?: string | null;
  approach?: string | null;
  highlight?: string | null;
  execution?: string | null;
  closing?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  tags?: string[];
  featured?: boolean;
  published?: boolean;
  heroMediaId?: string | null;
  summary?: string | null;
  description?: string | null;
  sortOrder?: number;
};

export async function createStudioProject(body: CreateStudioProjectBody) {
  const title = body.title?.trim();
  if (!title) {
    throw new Error("title is required.");
  }

  const section = await resolveSection(body);
  if (!section) {
    throw new Error(
      "pillar (any configured work pillar slug) or valid section (ACD, REA, CUL, BIZ, TRI) is required."
    );
  }

  const baseSlug = (body.slug?.trim() || slugify(title)).replace(/^-+|-+$/g, "") || "project";

  const existing = await prisma.workProject.findUnique({
    where: { section_slug: { section, slug: baseSlug } },
  });
  if (existing) {
    throw new Error(`A project with slug "${baseSlug}" already exists in this section.`);
  }

  const tags = Array.isArray(body.tags)
    ? body.tags.map((t) => String(t).trim()).filter(Boolean)
    : [];

  const heroMediaId = body.heroMediaId?.trim() || null;

  const created = await prisma.workProject.create({
    data: {
      section,
      title,
      slug: baseSlug,
      client: body.client?.trim() || null,
      projectType: body.category?.trim() || null,
      location: body.location?.trim() || null,
      year: typeof body.year === "number" && Number.isFinite(body.year) ? body.year : null,
      opening: body.opening?.trim() || null,
      context: body.context?.trim() || null,
      approach: body.approach?.trim() || null,
      highlight: body.highlight?.trim() || null,
      execution: body.execution?.trim() || null,
      closing: body.closing?.trim() || null,
      seoTitle: body.seoTitle?.trim() || null,
      metaDescription: body.seoDescription?.trim() || null,
      tags,
      isFeatured: Boolean(body.featured),
      published: Boolean(body.published),
      publishedAt: body.published ? new Date() : null,
      heroMediaId,
      summary: body.summary?.trim() || null,
      description: body.description?.trim() || null,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
    },
  });

  if (heroMediaId) {
    await prisma.projectMedia.create({
      data: { projectId: created.id, mediaId: heroMediaId, sortOrder: 0 },
    });
  }

  return prisma.workProject.findUnique({
    where: { id: created.id },
    include: {
      heroMedia: true,
      media: { include: { media: true }, orderBy: { sortOrder: "asc" } },
    },
  });
}

export type UpdateStudioProjectBody = {
  title?: string;
  slug?: string;
  client?: string | null;
  category?: string | null;
  location?: string | null;
  year?: number | null;
  opening?: string | null;
  context?: string | null;
  approach?: string | null;
  highlight?: string | null;
  execution?: string | null;
  closing?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  tags?: string[];
  featured?: boolean;
  published?: boolean;
  publishedAt?: string | null;
  heroMediaId?: string | null;
  summary?: string | null;
  description?: string | null;
  sortOrder?: number;
  /** Reorder gallery: full list of media IDs in order. */
  mediaIds?: string[];
};

function optTrim(v: string | null | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

export async function updateStudioProject(id: string, body: UpdateStudioProjectBody) {
  const existing = await prisma.workProject.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Project not found.");
  }

  let nextSlug = existing.slug;
  if (body.slug !== undefined) {
    const raw = body.slug == null ? "" : String(body.slug).trim();
    nextSlug = (raw || slugify(existing.title)).replace(/^-+|-+$/g, "") || "project";
    const conflict = await prisma.workProject.findFirst({
      where: { section: existing.section, slug: nextSlug, id: { not: id } },
    });
    if (conflict) {
      throw new Error(`Another project in this section already uses slug "${nextSlug}".`);
    }
  }

  await prisma.workProject.update({
    where: { id },
    data: {
      title: body.title !== undefined ? String(body.title).trim() : undefined,
      slug: body.slug !== undefined ? nextSlug : undefined,
      client: body.client !== undefined ? optTrim(body.client) : undefined,
      projectType: body.category !== undefined ? optTrim(body.category) : undefined,
      location: body.location !== undefined ? optTrim(body.location) : undefined,
      year:
        body.year !== undefined
          ? typeof body.year === "number" && Number.isFinite(body.year)
            ? body.year
            : null
          : undefined,
      opening: body.opening !== undefined ? optTrim(body.opening) : undefined,
      context: body.context !== undefined ? optTrim(body.context) : undefined,
      approach: body.approach !== undefined ? optTrim(body.approach) : undefined,
      highlight: body.highlight !== undefined ? optTrim(body.highlight) : undefined,
      execution: body.execution !== undefined ? optTrim(body.execution) : undefined,
      closing: body.closing !== undefined ? optTrim(body.closing) : undefined,
      seoTitle: body.seoTitle !== undefined ? optTrim(body.seoTitle) : undefined,
      metaDescription: body.seoDescription !== undefined ? optTrim(body.seoDescription) : undefined,
      tags: body.tags !== undefined ? body.tags.map((t) => String(t).trim()).filter(Boolean) : undefined,
      isFeatured: typeof body.featured === "boolean" ? body.featured : undefined,
      published: typeof body.published === "boolean" ? body.published : undefined,
      publishedAt:
        body.published === false
          ? null
          : body.publishedAt !== undefined
            ? body.publishedAt
              ? new Date(body.publishedAt)
              : null
            : undefined,
      heroMediaId: body.heroMediaId !== undefined ? body.heroMediaId : undefined,
      summary: body.summary !== undefined ? optTrim(body.summary) : undefined,
      description: body.description !== undefined ? optTrim(body.description) : undefined,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
    },
    include: {
      heroMedia: true,
      media: { include: { media: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  if (body.mediaIds && Array.isArray(body.mediaIds)) {
    const links = await prisma.projectMedia.findMany({ where: { projectId: id } });
    const linkByMediaId = new Map(links.map((l) => [l.mediaId, l]));
    const order = body.mediaIds.filter((mid) => linkByMediaId.has(mid));
    for (let i = 0; i < order.length; i++) {
      await prisma.projectMedia.updateMany({
        where: { projectId: id, mediaId: order[i] },
        data: { sortOrder: i },
      });
    }
  }

  return prisma.workProject.findUnique({
    where: { id },
    include: {
      heroMedia: true,
      media: { include: { media: true }, orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function publishStudioProject(body: { id?: string; section?: string; slug?: string }) {
  if (body.id?.trim()) {
    const existing = await prisma.workProject.findUnique({ where: { id: body.id.trim() } });
    if (!existing) {
      throw new Error("Project not found.");
    }
    return prisma.workProject.update({
      where: { id: body.id.trim() },
      data: { published: true, publishedAt: new Date() },
      include: {
        heroMedia: true,
        media: { include: { media: true }, orderBy: { sortOrder: "asc" } },
      },
    });
  }

  const section = body.section as WorkSection | undefined;
  const slug = body.slug?.trim();
  if (!section || !slug || !WORK_SECTIONS.includes(section)) {
    throw new Error("Provide id, or section + slug.");
  }

  const found = await prisma.workProject.findUnique({
    where: { section_slug: { section, slug } },
  });
  if (!found) {
    throw new Error("Project not found.");
  }

  return prisma.workProject.update({
    where: { section_slug: { section, slug } },
    data: { published: true, publishedAt: new Date() },
    include: {
      heroMedia: true,
      media: { include: { media: true }, orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function deleteStudioProject(id: string) {
  const existing = await prisma.workProject.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Project not found.");
  }
  await prisma.workProject.delete({ where: { id } });
}

/** Public URL pillar segment from DB section (uses CMS pillar map). */
export async function sectionToPillarSlug(section: WorkSection): Promise<string> {
  return mapWorkSectionToPillarSlug(section);
}
