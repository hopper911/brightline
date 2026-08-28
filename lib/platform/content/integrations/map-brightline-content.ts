import type {
  BrightlinePortfolioProjectSnapshot,
  BrightlinePublicContentStatus,
  BrightlineWorkProjectSnapshot,
} from "@/lib/platform/content/dto/brightline-public-content";
import type {
  BrightlinePortfolioProjectRow,
  BrightlineWorkProjectRow,
} from "@/lib/platform/content/integrations/brightline-content-read-port";
import type {
  ContentLifecycleState,
  ContentPublishedSnapshot,
  ContentRef,
  ContentReferenceSummary,
} from "@/lib/platform/content/types";
import { getTenantPublicOrigin } from "@/lib/platform/tenants/registry";

export const BRIGHTLINE_ADAPTER_CONTENT_TYPES = ["work-project", "portfolio-project"] as const;

export type BrightlineAdapterContentType = (typeof BRIGHTLINE_ADAPTER_CONTENT_TYPES)[number];

export function isBrightlineAdapterContentType(
  type: string
): type is BrightlineAdapterContentType {
  return (BRIGHTLINE_ADAPTER_CONTENT_TYPES as readonly string[]).includes(type);
}

function lifecycleFromPublished(published: boolean): ContentLifecycleState {
  return published ? "published" : "draft";
}

function iso(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString();
}

export function brightlineWorkProjectPublicPath(pillarSlug: string, slug: string): string {
  return `${getTenantPublicOrigin("brightline")}/work/${encodeURIComponent(pillarSlug)}/${encodeURIComponent(slug)}`;
}

export function brightlinePortfolioProjectPublicPath(categorySlug: string, slug: string): string {
  return `${getTenantPublicOrigin("brightline")}/portfolio/${encodeURIComponent(categorySlug)}/${encodeURIComponent(slug)}`;
}

export function mapWorkProjectToSnapshot(row: BrightlineWorkProjectRow): BrightlineWorkProjectSnapshot {
  return {
    title: row.title,
    slug: row.slug,
    pillarSlug: row.pillarSlug,
    section: row.section,
    summary: row.summary,
    location: row.location,
    year: row.year,
    isFeatured: row.isFeatured,
    seoTitle: row.seoTitle,
    metaDescription: row.metaDescription,
  };
}

export function mapPortfolioProjectToSnapshot(
  row: BrightlinePortfolioProjectRow
): BrightlinePortfolioProjectSnapshot {
  return {
    title: row.title,
    slug: row.slug,
    categorySlug: row.categorySlug,
    location: row.location,
    year: row.year,
    description: row.description,
    imageCount: row.imageCount,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
  };
}

export function mapWorkProjectToReferenceSummary(
  ref: ContentRef,
  row: BrightlineWorkProjectRow
): ContentReferenceSummary {
  return {
    ref,
    title: row.title,
    slug: row.slug,
    lifecycle: lifecycleFromPublished(row.published),
    publicPath: row.published ? brightlineWorkProjectPublicPath(row.pillarSlug, row.slug) : null,
    publishedAt: row.published ? iso(row.updatedAt) : null,
    updatedAt: iso(row.updatedAt),
    operational: {
      pillarSlug: row.pillarSlug,
      section: row.section,
    },
  };
}

export function mapPortfolioProjectToReferenceSummary(
  ref: ContentRef,
  row: BrightlinePortfolioProjectRow
): ContentReferenceSummary {
  return {
    ref,
    title: row.title,
    slug: row.slug,
    lifecycle: lifecycleFromPublished(row.published),
    publicPath: row.published
      ? brightlinePortfolioProjectPublicPath(row.categorySlug, row.slug)
      : null,
    publishedAt: row.published ? iso(row.updatedAt) : null,
    updatedAt: iso(row.updatedAt),
  };
}

export function mapWorkProjectToPublishedSnapshot(
  ref: ContentRef,
  row: BrightlineWorkProjectRow
): ContentPublishedSnapshot | null {
  if (!row.published) return null;
  return {
    ref,
    title: row.title,
    slug: row.slug,
    lifecycle: "published",
    publicPath: brightlineWorkProjectPublicPath(row.pillarSlug, row.slug),
    publishedAt: iso(row.updatedAt),
    payload: mapWorkProjectToSnapshot(row),
  };
}

export function mapPortfolioProjectToPublishedSnapshot(
  ref: ContentRef,
  row: BrightlinePortfolioProjectRow
): ContentPublishedSnapshot | null {
  if (!row.published) return null;
  return {
    ref,
    title: row.title,
    slug: row.slug,
    lifecycle: "published",
    publicPath: brightlinePortfolioProjectPublicPath(row.categorySlug, row.slug),
    publishedAt: iso(row.updatedAt),
    payload: mapPortfolioProjectToSnapshot(row),
  };
}

export function mapWorkProjectToStatus(row: BrightlineWorkProjectRow): BrightlinePublicContentStatus {
  return {
    lifecycle: lifecycleFromPublished(row.published),
    published: row.published,
    updatedAt: iso(row.updatedAt),
  };
}

export function mapPortfolioProjectToStatus(
  row: BrightlinePortfolioProjectRow
): BrightlinePublicContentStatus {
  return {
    lifecycle: lifecycleFromPublished(row.published),
    published: row.published,
    updatedAt: iso(row.updatedAt),
  };
}
