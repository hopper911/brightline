import { permanentRedirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SECTION_TO_PILLAR } from "@/lib/portfolioPillars";
import { normalizeProjectSlug } from "@/lib/slugify";
import WebsitePageView from "@/components/WebsitePageView";
import { getPublishedWebsitePageBySlug } from "@/lib/website-pages";

export const dynamic = "force-dynamic";

/**
 * Legacy published links used to be shared as `/{slug}`. Resolve those root
 * slugs to their canonical public routes so old gallery/project links keep working.
 */
export default async function LegacyRootSlugRedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = normalizeProjectSlug(rawSlug);
  if (!slug) notFound();

  const studioProject = await prisma.studioProject.findFirst({
    where: { slug: { equals: slug, mode: "insensitive" }, published: true },
    select: { slug: true },
  });
  if (studioProject) {
    permanentRedirect(`/work/${encodeURIComponent(studioProject.slug)}`);
  }

  const workProjects = await prisma.workProject.findMany({
    where: { slug: { equals: slug, mode: "insensitive" }, published: true },
    select: { slug: true, section: true },
    take: 2,
  });
  if (workProjects.length === 1) {
    const project = workProjects[0]!;
    permanentRedirect(
      `/work/${SECTION_TO_PILLAR[project.section]}/${encodeURIComponent(project.slug)}`
    );
  }
  if (workProjects.length > 1) {
    permanentRedirect("/work");
  }

  const portfolioProject = await prisma.portfolioProject.findFirst({
    where: { slug: { equals: slug, mode: "insensitive" }, published: true },
    select: { slug: true, categorySlug: true },
  });
  if (portfolioProject) {
    permanentRedirect(
      `/portfolio/${encodeURIComponent(portfolioProject.categorySlug)}/${encodeURIComponent(
        portfolioProject.slug
      )}`
    );
  }

  const clientGallery = await prisma.gallery.findFirst({
    where: { slug: { equals: slug, mode: "insensitive" }, published: true },
    select: { slug: true },
  });
  if (clientGallery) {
    permanentRedirect(`/client/${encodeURIComponent(clientGallery.slug)}`);
  }

  const websitePage = await getPublishedWebsitePageBySlug(slug);
  if (websitePage) {
    return <WebsitePageView page={websitePage} />;
  }

  notFound();
}
