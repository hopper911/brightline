/**
 * Studio OS slug helpers — thin facade over shared slugify + CMS uniqueness.
 */
export { normalizeProjectSlug, slugify } from "@/lib/slugify";
export { ensureUniqueStudioSlug } from "@/lib/studio/studio-project-cms";
