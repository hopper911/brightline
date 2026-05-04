/**
 * Strip internal / dev-only placeholder copy that must never appear on the public site.
 * Match is substring-based (case-insensitive) so edits in CMS still get caught.
 */
const STAFF_ONLY_FRAGMENTS = [
  "published studio cms projects",
  "marked as featured are promoted",
  "remain available at their direct",
] as const;

export function publicWorkSurfaceCopy(text: string | null | undefined): string | null {
  const t = text?.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  for (const frag of STAFF_ONLY_FRAGMENTS) {
    if (lower.includes(frag)) return null;
  }
  return t;
}

/** Full case-study document fields shown on `/work/{slug}` and related surfaces. */
export function sanitizePublishedStudioProjectForPublic<
  T extends {
    summary?: string | null;
    opening: string;
    context: string;
    approach: string;
    highlight: string;
    execution?: string | null;
    closing: string;
    credits?: string | null;
    seoDescription?: string | null;
  },
>(project: T): T {
  return {
    ...project,
    summary: publicWorkSurfaceCopy(project.summary) ?? null,
    opening: publicWorkSurfaceCopy(project.opening) ?? "",
    context: publicWorkSurfaceCopy(project.context) ?? "",
    approach: publicWorkSurfaceCopy(project.approach) ?? "",
    highlight: publicWorkSurfaceCopy(project.highlight) ?? "",
    execution: publicWorkSurfaceCopy(project.execution) ?? null,
    closing: publicWorkSurfaceCopy(project.closing) ?? "",
    credits: publicWorkSurfaceCopy(project.credits) ?? null,
    seoDescription: publicWorkSurfaceCopy(project.seoDescription) ?? null,
  };
}
