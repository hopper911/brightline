import type { ProjectWorkflowLifecycle } from "@/lib/platform/projects/types";

export type BrightlineWorkProjectLifecycleInput = {
  published: boolean;
  summary: string | null;
  description: string | null;
  heroMediaId: string | null;
  mediaCount: number;
  completeForPublish: boolean;
};

export type MirotechCaseStudyLifecycleInput = {
  status: "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED" | string;
  publishedAt: string | Date | null;
  heroImage: string | null;
  summary: string;
  sectionCount: number;
  completeForPublish: boolean;
};

export function mapBrightlineWorkProjectLifecycle(
  input: BrightlineWorkProjectLifecycleInput
): ProjectWorkflowLifecycle {
  if (input.published) return "PUBLISHED";
  const hasBody =
    Boolean(input.summary?.trim()) ||
    Boolean(input.description?.trim());
  const hasHero = Boolean(input.heroMediaId) || input.mediaCount > 0;
  if (hasBody && hasHero) return "MEDIA_READY";
  if (hasBody) return "CONTENT_READY";
  return "DRAFT";
}

export function mapMirotechCaseStudyLifecycle(
  input: MirotechCaseStudyLifecycleInput
): ProjectWorkflowLifecycle {
  const status = String(input.status).toUpperCase();
  if (status === "PUBLISHED") return "PUBLISHED";
  if (status === "ARCHIVED") return "ARCHIVED";
  if (status === "REVIEW") return "IN_REVIEW";
  const hasBody = Boolean(input.summary?.trim()) || input.sectionCount > 0;
  const hasHero = Boolean(input.heroImage?.trim());
  if (hasBody && hasHero) return "MEDIA_READY";
  if (hasBody) return "CONTENT_READY";
  return "DRAFT";
}
