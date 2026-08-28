import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sectionToPillarSlug } from "@/lib/work-pillar-settings";
import type {
  BrightlineContentReadPort,
  BrightlinePortfolioProjectRow,
  BrightlineWorkProjectRow,
} from "@/lib/platform/content/integrations/brightline-content-read-port";

const WORK_PROJECT_SELECT = {
  id: true,
  section: true,
  title: true,
  slug: true,
  summary: true,
  location: true,
  year: true,
  published: true,
  isFeatured: true,
  sortOrder: true,
  seoTitle: true,
  metaDescription: true,
  updatedAt: true,
  createdAt: true,
} as const;

const PORTFOLIO_PROJECT_SELECT = {
  id: true,
  title: true,
  slug: true,
  categorySlug: true,
  location: true,
  year: true,
  description: true,
  published: true,
  seoTitle: true,
  seoDescription: true,
  coverAlt: true,
  updatedAt: true,
  createdAt: true,
  _count: { select: { images: true } },
} as const;

async function toWorkProjectRow(
  row: {
    id: string;
    section: BrightlineWorkProjectRow["section"];
    title: string;
    slug: string;
    summary: string | null;
    location: string | null;
    year: number | null;
    published: boolean;
    isFeatured: boolean;
    sortOrder: number;
    seoTitle: string | null;
    metaDescription: string | null;
    updatedAt: Date;
    createdAt: Date;
  }
): Promise<BrightlineWorkProjectRow> {
  return {
    ...row,
    pillarSlug: await sectionToPillarSlug(row.section),
  };
}

export async function fetchBrightlineWorkProjectById(
  id: string,
  client: PrismaClient = prisma
): Promise<BrightlineWorkProjectRow | null> {
  const row = await client.workProject.findUnique({
    where: { id },
    select: WORK_PROJECT_SELECT,
  });
  if (!row) return null;
  return toWorkProjectRow(row);
}

export async function fetchBrightlinePortfolioProjectById(
  id: string,
  client: PrismaClient = prisma
): Promise<BrightlinePortfolioProjectRow | null> {
  const row = await client.portfolioProject.findUnique({
    where: { id },
    select: PORTFOLIO_PROJECT_SELECT,
  });
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    categorySlug: row.categorySlug,
    location: row.location,
    year: row.year,
    description: row.description,
    published: row.published,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    coverAlt: row.coverAlt,
    imageCount: row._count.images,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
  };
}

/** Default read port — Prisma selects with no client/gallery/delivery fields. */
export const defaultBrightlineContentReadPort: BrightlineContentReadPort = {
  getWorkProjectById: (id) => fetchBrightlineWorkProjectById(id),
  getPortfolioProjectById: (id) => fetchBrightlinePortfolioProjectById(id),
};
