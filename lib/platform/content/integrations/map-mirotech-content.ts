import type { DualBrandWorkProject } from "@/lib/dual-brand/content-api";
import { distributionStatus, type HubProject } from "@/lib/dual-brand/studio-hub";
import type {
  MirotechCaseStudySnapshot,
  MirotechCaseStudyStatus,
} from "@/lib/platform/content/dto/mirotech-case-study";
import type {
  ContentDistributionSnapshot,
  ContentLifecycleState,
  ContentPublishedSnapshot,
  ContentRef,
  ContentReferenceSummary,
} from "@/lib/platform/content/types";
import { getTenantPublicOrigin } from "@/lib/platform/tenants/registry";

export const MIROTECH_ADAPTER_CONTENT_TYPES = [
  "mirotech-case-study",
  "dual-brand-work",
] as const;

export type MirotechAdapterContentType = (typeof MIROTECH_ADAPTER_CONTENT_TYPES)[number];

export function isMirotechAdapterContentType(
  type: string
): type is MirotechAdapterContentType {
  return (MIROTECH_ADAPTER_CONTENT_TYPES as readonly string[]).includes(type);
}

export function mirotechCaseStudyPublicPath(slug: string): string {
  return `${getTenantPublicOrigin("mirotech")}/work/${encodeURIComponent(slug)}`;
}

export function hubLifecycleFromStatus(status: string | null | undefined): ContentLifecycleState {
  if (status === "PUBLISHED") return "published";
  if (status === "ARCHIVED") return "archived";
  return "draft";
}

function nullableString(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function mapWorkProjectToCaseStudySnapshot(
  project: DualBrandWorkProject
): MirotechCaseStudySnapshot {
  return {
    title: project.title,
    slug: project.slug,
    summary: project.summary,
    year: project.year ?? null,
    categories: project.categories ?? [],
    disciplines: project.disciplines ?? [],
    featured: Boolean(project.featured),
    heroImageKey: nullableString(project.heroImage),
    thumbnailImageKey: nullableString(project.thumbnailImage),
    seoTitle: nullableString(project.seoTitle),
    seoDescription: nullableString(project.seoDescription),
  };
}

export function mapHubProjectToCaseStudySnapshot(project: HubProject): MirotechCaseStudySnapshot {
  return {
    title: project.title,
    slug: project.slug,
    summary: project.summary,
    year: project.year,
    categories: project.categories ?? [],
    disciplines: project.disciplines ?? [],
    featured: Boolean(project.featuredMirotech),
    heroImageKey: nullableString(project.heroImage),
    thumbnailImageKey: nullableString(project.thumbnailImage),
    seoTitle: nullableString(project.seoTitle),
    seoDescription: nullableString(project.seoDescription),
  };
}

export function mapWorkProjectToReferenceSummary(
  ref: ContentRef,
  project: DualBrandWorkProject
): ContentReferenceSummary {
  return {
    ref,
    title: project.title,
    slug: project.slug,
    lifecycle: "published",
    publicPath: mirotechCaseStudyPublicPath(project.slug),
    publishedAt: nullableString(project.publishedAt),
    updatedAt: nullableString(project.publishedAt),
  };
}

export function mapHubProjectToReferenceSummary(
  ref: ContentRef,
  project: HubProject
): ContentReferenceSummary {
  return {
    ref,
    title: project.title,
    slug: project.slug,
    lifecycle: hubLifecycleFromStatus(project.status),
    publicPath: mirotechCaseStudyPublicPath(project.slug),
    publishedAt: nullableString(project.publishedAt),
    updatedAt: nullableString(project.updatedAt),
  };
}

export function mapWorkProjectToPublishedSnapshot(
  ref: ContentRef,
  project: DualBrandWorkProject
): ContentPublishedSnapshot {
  return {
    ref,
    title: project.title,
    slug: project.slug,
    lifecycle: "published",
    publicPath: mirotechCaseStudyPublicPath(project.slug),
    publishedAt: nullableString(project.publishedAt),
    payload: mapWorkProjectToCaseStudySnapshot(project),
  };
}

export function mapHubProjectToPublishedSnapshot(
  ref: ContentRef,
  project: HubProject
): ContentPublishedSnapshot | null {
  const lifecycle = hubLifecycleFromStatus(project.status);
  if (!project.publishMirotech || lifecycle !== "published") {
    return null;
  }
  return {
    ref,
    title: project.title,
    slug: project.slug,
    lifecycle,
    publicPath: mirotechCaseStudyPublicPath(project.slug),
    publishedAt: nullableString(project.publishedAt),
    payload: mapHubProjectToCaseStudySnapshot(project),
  };
}

export function mapHubProjectToStatus(project: HubProject): MirotechCaseStudyStatus {
  return {
    lifecycle: hubLifecycleFromStatus(project.status),
    publishedAt: nullableString(project.publishedAt),
    updatedAt: nullableString(project.updatedAt),
    publishBrightline: Boolean(project.publishBrightline),
    publishMirotech: Boolean(project.publishMirotech),
  };
}

export function mapWorkProjectToStatus(project: DualBrandWorkProject): MirotechCaseStudyStatus {
  return {
    lifecycle: "published",
    publishedAt: nullableString(project.publishedAt),
    updatedAt: nullableString(project.publishedAt),
    publishBrightline: Boolean(project.publishBrightline),
    publishMirotech: project.publishMirotech !== false,
  };
}

export function mapHubProjectToDistribution(ref: ContentRef, project: HubProject): ContentDistributionSnapshot {
  const journal = project.journalPosts?.[0] ?? project.journalSummaries?.[0];
  const distribution = distributionStatus({
    workStatus: project.status,
    publishBrightline: project.publishBrightline,
    publishMirotech: project.publishMirotech,
    blogStatus: journal?.status ?? null,
    blogPrimarySite: journal?.primarySite ?? null,
  });
  return {
    ref,
    brightline: distribution.brightlineWork,
    mirotech: distribution.mirotechWork,
    journal: distribution.blog,
  };
}
