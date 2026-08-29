import { slugify } from "@/lib/slugify";
import { ProjectSlugConflictError } from "@/lib/platform/projects/errors";

export type ResolveProjectSlugInput = {
  title: string;
  slugInput?: string;
  conflictPolicy: "reject" | "suffix";
  isTaken: (slug: string) => Promise<boolean>;
};

export type ResolveProjectSlugResult = {
  slug: string;
  /** True when a suffix was applied after a collision. */
  suffixed: boolean;
};

/**
 * Deterministic slug normalization aligned with admin work-project routes.
 */
export function normalizeProjectSlugInput(title: string, slugInput?: string): string {
  const base = slugInput?.trim() || title;
  const normalized = slugify(base).replace(/^-+|-+$/g, "");
  return normalized || "project";
}

/**
 * Mirotech Content API suffix convention when slug collides.
 */
export function suffixProjectSlug(slug: string): string {
  return `${slug}-${Date.now().toString(36)}`;
}

export async function resolveProjectSlug(
  input: ResolveProjectSlugInput
): Promise<ResolveProjectSlugResult> {
  let slug = normalizeProjectSlugInput(input.title, input.slugInput);

  if (!(await input.isTaken(slug))) {
    return { slug, suffixed: false };
  }

  if (input.conflictPolicy === "reject") {
    throw new ProjectSlugConflictError(slug);
  }

  const suffixed = suffixProjectSlug(slug);
  if (await input.isTaken(suffixed)) {
    throw new ProjectSlugConflictError(slug);
  }

  return { slug: suffixed, suffixed: true };
}
