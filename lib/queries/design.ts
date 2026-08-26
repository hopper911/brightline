import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { resolveFullBleedMediaUrl } from "@/lib/r2";
import {
  getDesignSectionSettings,
  normalizeSpecimenBlocks,
  type DesignSpecimenBlock,
} from "@/lib/design-section-settings";
import { getVisibleWorkPillars } from "@/lib/work-pillar-settings";
import {
  normalizeCaseStudy,
  type DesignCaseStudy,
} from "@/lib/design/case-study";
import type { DesignPortfolioStatusId } from "@/lib/design/status";
import { normalizeDesignPortfolioStatus } from "@/lib/design/status";

export type DesignProjectCard = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  problemStatement: string | null;
  year: number | null;
  clientName: string | null;
  platformLabel: string | null;
  status: DesignPortfolioStatusId;
  disciplines: string[];
  featured: boolean;
  coverUrl: string | null;
  coverAlt: string | null;
};

export type DesignProjectDetail = DesignProjectCard & {
  brief: string | null;
  approach: string | null;
  outcome: string | null;
  role: string | null;
  timelineLabel: string | null;
  teamLabel: string | null;
  toolsLabel: string | null;
  industryLabel: string | null;
  projectTypeLabel: string | null;
  yearEnd: number | null;
  caseStudy: DesignCaseStudy;
  specimenBlocks: Array<DesignSpecimenBlock & { imageUrl: string }>;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageUrl: string | null;
  relatedServicesEnabled: boolean;
  relatedServicesIntro: string | null;
  relatedServicesLinks: unknown;
  relatedWork: {
    title: string;
    href: string;
  } | null;
};

function mediaUrl(key: string | null | undefined, fallback?: string | null): string | null {
  if (fallback?.trim()) return resolveFullBleedMediaUrl(fallback);
  if (!key?.trim()) return null;
  const k = key.trim();
  if (/^(https?:|data:|blob:)/i.test(k) || k.startsWith("/")) return resolveFullBleedMediaUrl(k);
  return resolveFullBleedMediaUrl(k);
}

const coverSelect = {
  id: true,
  alt: true,
  keyFull: true,
  keyThumb: true,
} as const;

function mapCard(row: {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  problemStatement: string | null;
  year: number | null;
  clientName: string | null;
  platformLabel: string | null;
  status: string;
  disciplines: string[];
  featured: boolean;
  coverMedia: { alt: string | null; keyFull: string | null; keyThumb: string | null } | null;
}): DesignProjectCard {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    problemStatement: row.problemStatement,
    year: row.year,
    clientName: row.clientName,
    platformLabel: row.platformLabel,
    status: normalizeDesignPortfolioStatus(row.status),
    disciplines: row.disciplines,
    featured: row.featured,
    coverUrl: mediaUrl(row.coverMedia?.keyFull ?? row.coverMedia?.keyThumb),
    coverAlt: row.coverMedia?.alt ?? row.title,
  };
}

export const listPublishedDesignProjects = cache(
  async (discipline?: string): Promise<DesignProjectCard[]> => {
    const settings = await getDesignSectionSettings();
    if (!settings.enabled) return [];

    const rows = await prisma.designProject.findMany({
      where: {
        published: true,
        ...(discipline ? { disciplines: { has: discipline } } : {}),
      },
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { updatedAt: "desc" }],
      include: { coverMedia: { select: coverSelect } },
    });

    return rows.map(mapCard);
  }
);

export const listFeaturedDesignProjects = cache(async (limit = 3): Promise<DesignProjectCard[]> => {
  const settings = await getDesignSectionSettings();
  if (!settings.enabled || !settings.showOnHome) return [];

  const rows = await prisma.designProject.findMany({
    where: { published: true, featured: true },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    take: limit,
    include: { coverMedia: { select: coverSelect } },
  });

  if (rows.length >= limit) return rows.map(mapCard);

  const more = await prisma.designProject.findMany({
    where: {
      published: true,
      ...(rows.length ? { id: { notIn: rows.map((r) => r.id) } } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    take: limit - rows.length,
    include: { coverMedia: { select: coverSelect } },
  });

  return [...rows, ...more].map(mapCard);
});

export const getPublishedDesignProjectBySlug = cache(
  async (slug: string): Promise<DesignProjectDetail | null> => {
    const settings = await getDesignSectionSettings();
    if (!settings.enabled) return null;

    const row = await prisma.designProject.findFirst({
      where: { slug, published: true },
      include: {
        coverMedia: { select: coverSelect },
        relatedWorkProject: {
          select: {
            id: true,
            title: true,
            slug: true,
            section: true,
            published: true,
          },
        },
      },
    });
    if (!row) return null;

    const blocks = normalizeSpecimenBlocks(row.specimenBlocks)
      .map((b) => ({
        ...b,
        imageUrl: mediaUrl(b.imageKey) ?? "",
      }))
      .filter((b) => b.imageUrl);

    let relatedWork: DesignProjectDetail["relatedWork"] = null;
    if (row.relatedWorkProject?.published) {
      const pillars = await getVisibleWorkPillars();
      const hrefPillar = pillars.find((p) =>
        p.sections.includes(row.relatedWorkProject!.section)
      )?.slug;
      if (hrefPillar) {
        relatedWork = {
          title: row.relatedWorkProject.title,
          href: `/work/${hrefPillar}/${row.relatedWorkProject.slug}`,
        };
      }
    }

    const card = mapCard(row);

    return {
      ...card,
      brief: row.brief,
      approach: row.approach,
      outcome: row.outcome,
      role: row.role,
      timelineLabel: row.timelineLabel,
      teamLabel: row.teamLabel,
      toolsLabel: row.toolsLabel,
      industryLabel: row.industryLabel,
      projectTypeLabel: row.projectTypeLabel,
      yearEnd: row.yearEnd,
      caseStudy: normalizeCaseStudy(row.caseStudy),
      specimenBlocks: blocks,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      ogImageUrl: mediaUrl(row.ogImageKey) ?? card.coverUrl,
      relatedServicesEnabled: row.relatedServicesEnabled,
      relatedServicesIntro: row.relatedServicesIntro,
      relatedServicesLinks: row.relatedServicesLinks,
      relatedWork,
    };
  }
);

export const listRelatedDesignProjects = cache(
  async (slug: string, limit = 3): Promise<DesignProjectCard[]> => {
    const current = await getPublishedDesignProjectBySlug(slug);
    if (!current) return [];
    const all = await listPublishedDesignProjects();
    return all.filter((p) => p.slug !== slug).slice(0, limit);
  }
);

export const listPublishedDesignSlugsForSitemap = cache(async () => {
  const settings = await getDesignSectionSettings();
  if (!settings.enabled) return [] as Array<{ slug: string; updatedAt: Date }>;
  return prisma.designProject.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
});
