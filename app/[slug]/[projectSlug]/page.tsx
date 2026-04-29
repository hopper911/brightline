import { notFound, permanentRedirect } from "next/navigation";
import { isKnownPillarSlug } from "@/lib/work-pillar-settings";
import { getProjectByPillarAndSlug } from "@/lib/queries/work";
import { normalizeProjectSlug } from "@/lib/slugify";

export const dynamic = "force-dynamic";

/**
 * Shorthand project links such as `/advertising/erny` resolve to
 * the canonical work URL `/work/advertising/erny`.
 * Only pillar slugs configured under Admin → Work pillars are accepted;
 * all other two-segment paths are left to more specific routes or 404.
 */
export default async function PillarProjectShortLinkPage({
  params,
}: {
  params: Promise<{ slug: string; projectSlug: string }>;
}) {
  const { slug: rawPillar, projectSlug: rawProject } = await params;
  const pillar = rawPillar.toLowerCase();
  if (!(await isKnownPillarSlug(pillar))) {
    notFound();
  }
  const slug = normalizeProjectSlug(rawProject);
  if (!slug) {
    notFound();
  }

  let project;
  try {
    project = await getProjectByPillarAndSlug(pillar, slug);
  } catch {
    notFound();
  }
  if (!project) {
    notFound();
  }

  permanentRedirect(
    `/work/${pillar}/${encodeURIComponent(project.slug)}`
  );
}
