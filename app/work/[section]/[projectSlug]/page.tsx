import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import WorkProjectCaseStudy from "@/components/work/WorkProjectCaseStudy";
import { normalizeProjectSlug } from "@/lib/slugify";
import { getPillarBySlug, isKnownPillarSlug } from "@/lib/work-pillar-settings";
import { getProjectByPillarAndSlug } from "@/lib/queries/work";
import { getPublicR2Url } from "@/lib/r2";
import { BRAND } from "@/lib/config/brand";
import { getPillarCaseStudyDefaults } from "@/lib/pillarCaseStudyDefaults";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string; projectSlug: string }>;
}): Promise<Metadata> {
  const { section, projectSlug } = await params;
  if (!(await isKnownPillarSlug(section))) {
    return { title: "Project · BRIGHTLINE Photography" };
  }
  const slug = normalizeProjectSlug(projectSlug);
  let proj;
  try {
    proj = await getProjectByPillarAndSlug(section, slug);
  } catch {
    return { title: "Work · BRIGHTLINE Photography" };
  }
  if (!proj) {
    return { title: "Project · BRIGHTLINE Photography" };
  }

  const pillar = await getPillarBySlug(section);
  const defaults = pillar ? getPillarCaseStudyDefaults(pillar.slug) : null;
  const servicePhrase = defaults?.serviceTypePhrase ?? "Photographer";
  const locationPart = proj.location ? ` in ${proj.location}` : "";

  const title = proj.seoTitle
    ? `${proj.seoTitle} | ${BRAND.name}`
    : `${proj.title} | ${servicePhrase}${locationPart} | ${BRAND.name}`;
  const description =
    proj.metaDescription ??
    (proj.opening?.trim() ? proj.opening.trim().slice(0, 160) : null) ??
    proj.summary ??
    proj.description ??
    `${proj.title} photography project.`;
  const canonicalUrl = `${BRAND.url}/work/${section}/${proj.slug}`;

  let ogImageUrl = `${BRAND.url}/og-image.svg`;
  const hero = proj.heroMedia;
  if (hero?.kind === "IMAGE" && hero.keyFull) {
    ogImageUrl = getPublicR2Url(hero.keyFull ?? "");
  } else if (hero?.kind === "VIDEO" && hero.posterKey) {
    ogImageUrl = getPublicR2Url(hero.posterKey ?? "");
  }

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: proj.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

function WorkUpdatingFallback() {
  return (
    <div className="section-pad mx-auto max-w-6xl px-6 lg:px-10">
      <div className="rounded-2xl border border-white/10 bg-black/40 p-12 text-center">
        <h1 className="section-title">Work is updating</h1>
        <p className="mt-4 text-white/70">Please check back shortly.</p>
        <Link href="/work" className="btn btn-ghost mt-6">
          Back to work
        </Link>
      </div>
    </div>
  );
}

export default async function WorkProjectPage({
  params,
}: {
  params: Promise<{ section: string; projectSlug: string }>;
}) {
  const { section: pillarParam, projectSlug } = await params;

  if (!(await isKnownPillarSlug(pillarParam))) {
    notFound();
  }

  const pillar = await getPillarBySlug(pillarParam);
  if (!pillar || pillar.visible === false) notFound();

  const slug = normalizeProjectSlug(projectSlug);
  let project;
  try {
    project = await getProjectByPillarAndSlug(pillarParam, slug);
  } catch {
    return <WorkUpdatingFallback />;
  }
  if (!project) {
    notFound();
  }

  return (
    <WorkProjectCaseStudy
      project={project}
      pillarSlug={pillarParam}
      pillarLabel={pillar.label}
    />
  );
}
