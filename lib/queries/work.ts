import type { WorkSection } from "@prisma/client";
import { getPillarBySlug } from "@/lib/work-pillar-settings";
import { prisma } from "@/lib/prisma";
import { normalizeProjectSlug } from "@/lib/slugify";

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
    include: {
      heroMedia: true,
      media: {
        include: { media: true },
        orderBy: { sortOrder: "asc" },
      },
    },
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
    include: {
      heroMedia: true,
      media: {
        include: { media: true },
        orderBy: { sortOrder: "asc" },
      },
    },
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
