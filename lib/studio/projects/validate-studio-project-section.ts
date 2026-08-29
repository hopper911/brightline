import type { ContentRef } from "@/lib/platform/content/types";

export type StudioProjectEditorSection =
  | "overview"
  | "content"
  | "details"
  | "seo"
  | "publishing";

const SEO_TITLE_SOFT_MAX = 60;
const SEO_DESC_SOFT_MAX = 160;

function cleanOptionalString(value: unknown, maxLen?: number): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (maxLen && s.length > maxLen) {
    throw new Error(`Value exceeds ${maxLen} characters.`);
  }
  return s;
}

function cleanRequiredString(value: unknown, field: string, maxLen?: number): string {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) throw new Error(`${field} is required.`);
  if (maxLen && s.length > maxLen) {
    throw new Error(`${field} exceeds ${maxLen} characters.`);
  }
  return s;
}

export function validateStudioProjectSectionSave(
  ref: ContentRef,
  section: StudioProjectEditorSection,
  data: Record<string, unknown>
): Record<string, unknown> {
  if (ref.type === "work-project") {
    switch (section) {
      case "overview":
        return {
          title: cleanRequiredString(data.title, "Title", 200),
          slug: cleanRequiredString(data.slug, "Slug", 120),
          summary: cleanOptionalString(data.summary, 500),
        };
      case "content":
        return {
          summary: cleanOptionalString(data.summary, 500),
          description: cleanOptionalString(data.description, 8000),
          opening: cleanOptionalString(data.opening, 4000),
          context: cleanOptionalString(data.context, 4000),
          approach: cleanOptionalString(data.approach, 4000),
          highlight: cleanOptionalString(data.highlight, 2000),
          execution: cleanOptionalString(data.execution, 4000),
          closing: cleanOptionalString(data.closing, 4000),
          credits: cleanOptionalString(data.credits, 2000),
          overviewExtended: cleanOptionalString(data.overviewExtended, 4000),
          whatWasPhotographed: cleanOptionalString(data.whatWasPhotographed, 2000),
          visualApproach: cleanOptionalString(data.visualApproach, 2000),
          locationContext: cleanOptionalString(data.locationContext, 2000),
          whoIsThisFor: cleanOptionalString(data.whoIsThisFor, 2000),
        };
      case "details":
        return {
          title: cleanRequiredString(data.title, "Title", 200),
          slug: cleanRequiredString(data.slug, "Slug", 120),
          location: cleanOptionalString(data.location, 200),
          year: typeof data.year === "number" && Number.isFinite(data.year) ? data.year : null,
          client: cleanOptionalString(data.client, 200),
          projectType: cleanOptionalString(data.projectType, 200),
          scope: cleanOptionalString(data.scope, 500),
          isFeatured: Boolean(data.isFeatured),
          sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
          pillar: typeof data.pillarSlug === "string" ? data.pillarSlug.trim() : undefined,
        };
      case "seo":
        const seoTitle = cleanOptionalString(data.seoTitle, SEO_TITLE_SOFT_MAX + 40);
        const metaDescription = cleanOptionalString(data.metaDescription, SEO_DESC_SOFT_MAX + 80);
        return { seoTitle, metaDescription };
      case "publishing":
        if (data.published === true && data.completenessComplete !== true) {
          throw new Error("Project is not complete enough to publish.");
        }
        return { published: Boolean(data.published) };
      default:
        throw new Error("Unknown section.");
    }
  }

  if (ref.type === "mirotech-case-study") {
    switch (section) {
      case "overview":
        return {
          title: cleanRequiredString(data.title, "Title", 200),
          slug: cleanRequiredString(data.slug, "Slug", 120),
          summary: cleanOptionalString(data.summary, 500),
        };
      case "content":
        return {
          summary: cleanOptionalString(data.summary, 500),
          challenge: cleanOptionalString(data.challenge, 4000),
          outcome: cleanOptionalString(data.outcome, 4000),
          role: cleanOptionalString(data.role, 500),
          duration: cleanOptionalString(data.duration, 200),
          whatsNext: cleanOptionalString(data.whatsNext, 2000),
          projectDisclaimer: cleanOptionalString(data.projectDisclaimer, 2000),
          photoNarrative:
            data.photoNarrative && typeof data.photoNarrative === "object"
              ? data.photoNarrative
              : undefined,
          sections: Array.isArray(data.sections) ? data.sections : undefined,
        };
      case "details":
        return {
          title: cleanRequiredString(data.title, "Title", 200),
          slug: cleanRequiredString(data.slug, "Slug", 120),
          year: typeof data.year === "number" && Number.isFinite(data.year) ? data.year : null,
          status: cleanOptionalString(data.status, 40),
          projectType: cleanOptionalString(data.projectType, 200),
          clientType: cleanOptionalString(data.clientType, 200),
          categories: Array.isArray(data.categories) ? data.categories : undefined,
          disciplines: Array.isArray(data.disciplines) ? data.disciplines : undefined,
          tools: Array.isArray(data.tools) ? data.tools : undefined,
          platforms: Array.isArray(data.platforms) ? data.platforms : undefined,
        };
      case "seo":
        return {
          seoTitle: cleanOptionalString(data.seoTitle, SEO_TITLE_SOFT_MAX + 40),
          seoDescription: cleanOptionalString(data.seoDescription, SEO_DESC_SOFT_MAX + 80),
        };
      case "publishing":
        if (data.status === "PUBLISHED" && data.completenessComplete !== true) {
          throw new Error("Project is not complete enough to publish.");
        }
        return {
          status: cleanOptionalString(data.status, 40),
          publishMirotech: Boolean(data.publishMirotech),
          publishBrightline: Boolean(data.publishBrightline),
        };
      default:
        throw new Error("Unknown section.");
    }
  }

  throw new Error("Unsupported project type.");
}

export function seoLengthHints(title: string | null, description: string | null) {
  const titleLen = title?.trim().length ?? 0;
  const descLen = description?.trim().length ?? 0;
  return {
    titleLen,
    descLen,
    titleSoftMax: SEO_TITLE_SOFT_MAX,
    descSoftMax: SEO_DESC_SOFT_MAX,
    titleOk: titleLen <= SEO_TITLE_SOFT_MAX,
    descOk: descLen <= SEO_DESC_SOFT_MAX,
  };
}
