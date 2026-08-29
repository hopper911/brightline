import type { WorkSection, Prisma } from "@prisma/client";
import { getPillarBySlug } from "@/lib/work-pillar-settings";
import { prisma } from "@/lib/prisma";
import { normalizeProjectSlug } from "@/lib/slugify";

const WORK_CASE_STUDY_INCLUDE = {
  heroMedia: true,
  media: {
    include: { media: true },
    orderBy: { sortOrder: "asc" as const },
  },
} satisfies Prisma.WorkProjectInclude;

export type WorkProjectCaseStudyData = Prisma.WorkProjectGetPayload<{
  include: typeof WORK_CASE_STUDY_INCLUDE;
}>;

export async function getPublishedProjectsBySection(section: WorkSection) {
  return prisma.workProject.findMany({
    where: { section, published: true },
    include: {
      heroMedia: true,
    },
    orderBy: [
      { isFeatured: "desc" },
      { sortOrder: "asc" },
      { year: "desc" },
      { createdAt: "desc" },
    ],
  });
}

export async function getProjectByPillarAndSlug(pillarSlug: string, slug: string) {
  const pillar = await getPillarBySlug(pillarSlug);
  if (!pillar) return null;
  const normalized = normalizeProjectSlug(slug);
  return prisma.workProject.findFirst({
    where: {
      section: { in: pillar.sections },
      slug: { equals: normalized, mode: "insensitive" },
      published: true,
    },
    include: WORK_CASE_STUDY_INCLUDE,
  });
}

/** Admin draft preview — any project by id, published or not. */
export async function getWorkProjectByIdForPreview(
  id: string
): Promise<WorkProjectCaseStudyData | null> {
  return prisma.workProject.findUnique({
    where: { id },
    include: WORK_CASE_STUDY_INCLUDE,
  });
}

export async function getProjectBySectionAndSlug(
  section: WorkSection,
  slug: string
) {
  const normalized = normalizeProjectSlug(slug);
  return prisma.workProject.findFirst({
    where: {
      section,
      slug: { equals: normalized, mode: "insensitive" },
      published: true,
    },
    include: WORK_CASE_STUDY_INCLUDE,
  });
}

export async function getFeaturedHeroForSection(section: WorkSection) {
  const project = await prisma.workProject.findFirst({
    where: { section, published: true },
    include: { heroMedia: true },
    orderBy: [
      { isFeatured: "desc" },
      { sortOrder: "asc" },
      { year: "desc" },
      { createdAt: "desc" },
    ],
  });
  return project?.heroMedia ?? null;
}

type HeroMedia = Prisma.MediaAssetGetPayload<Record<string, never>>;

/** One batched query — best featured hero per section (for home/work pillar covers). */
export async function getFeaturedHeroMapForSections(
  sections: WorkSection[]
): Promise<Map<WorkSection, HeroMedia>> {
  const unique = [...new Set(sections)];
  if (unique.length === 0) return new Map();

  const projects = await prisma.workProject.findMany({
    where: { section: { in: unique }, published: true },
    include: { heroMedia: true },
    orderBy: [
      { isFeatured: "desc" },
      { sortOrder: "asc" },
      { year: "desc" },
      { createdAt: "desc" },
    ],
  });

  const map = new Map<WorkSection, HeroMedia>();
  for (const project of projects) {
    if (!project.heroMedia || map.has(project.section)) continue;
    map.set(project.section, project.heroMedia);
  }
  return map;
}

export async function getPublishedProjectsBySections(sections: WorkSection[]) {
  if (sections.length === 0) return [];
  return prisma.workProject.findMany({
    where: { section: { in: sections }, published: true },
    include: { heroMedia: true },
    orderBy: [
      { isFeatured: "desc" },
      { sortOrder: "asc" },
      { year: "desc" },
      { createdAt: "desc" },
    ],
  });
}
