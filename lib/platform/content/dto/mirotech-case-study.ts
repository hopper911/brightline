/**
 * Platform DTO for Mirotech case study reads (Phase 5B).
 * Intentionally excludes raw CMS section bodies and internal hub fields.
 */

export type MirotechCaseStudySnapshot = {
  title: string;
  slug: string;
  summary: string;
  year: number | null;
  categories: string[];
  disciplines: string[];
  featured: boolean;
  heroImageKey: string | null;
  thumbnailImageKey: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

export type MirotechCaseStudyStatus = {
  lifecycle: "draft" | "published" | "archived";
  publishedAt: string | null;
  updatedAt: string | null;
  publishBrightline: boolean;
  publishMirotech: boolean;
};
