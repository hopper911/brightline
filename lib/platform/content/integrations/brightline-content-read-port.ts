import type { WorkSection } from "@prisma/client";

/** Minimal work project row — explicit public/operational fields only (Phase 5C). */
export type BrightlineWorkProjectRow = {
  id: string;
  section: WorkSection;
  pillarSlug: string;
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
};

/** Minimal legacy portfolio row — no image URLs or studio/client linkage. */
export type BrightlinePortfolioProjectRow = {
  id: string;
  title: string;
  slug: string;
  categorySlug: string;
  location: string | null;
  year: string | null;
  description: string | null;
  published: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  coverAlt: string | null;
  imageCount: number;
  updatedAt: Date;
  createdAt: Date;
};

export type BrightlineContentReadPort = {
  getWorkProjectById(id: string): Promise<BrightlineWorkProjectRow | null>;
  getPortfolioProjectById(id: string): Promise<BrightlinePortfolioProjectRow | null>;
};
