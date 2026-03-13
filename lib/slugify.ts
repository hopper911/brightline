/**
 * Normalizes a string to a URL-friendly slug.
 * Matches the logic used when saving work project slugs in admin.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Normalizes an incoming project slug from the URL for DB lookup.
 * Handles URLs that use the title (e.g. "220 Hudson St — Office Renovation")
 * instead of the stored slug (e.g. "220-hudson-st-office-renovation").
 */
export function normalizeProjectSlug(projectSlug: string): string {
  let decoded = projectSlug;
  try {
    decoded = decodeURIComponent(projectSlug);
  } catch {
    // Invalid encoding, use as-is
  }
  return slugify(decoded);
}
