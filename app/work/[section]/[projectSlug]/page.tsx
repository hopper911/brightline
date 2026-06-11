import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Reveal from "@/components/Reveal";
import VideoEmbed from "@/components/VideoEmbed";
import WorkProjectGallery from "@/components/WorkProjectGallery";
import PageBackground from "@/components/PageBackground";
import { normalizeProjectSlug } from "@/lib/slugify";
import { getPillarBySlug, isKnownPillarSlug } from "@/lib/work-pillar-settings";
import { getProjectByPillarAndSlug } from "@/lib/queries/work";
import { getPublicR2Url } from "@/lib/r2";
import { BRAND } from "@/lib/config/brand";
import { getPillarCaseStudyDefaults } from "@/lib/pillarCaseStudyDefaults";
import { getPillarSeoLinkPhrase, getPillarSeoServiceUrl } from "@/lib/pillarToSeoServiceUrl";
import { getServiceSlugsForPillar } from "@/lib/pillarToServices";
import { services } from "@/app/services/data";

export const dynamic = "force-dynamic";

const BLUR_DATA =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iNyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iI2U4ZTllYSIvPjwvc3ZnPg==";

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

  const hero = project.heroMedia;
  const heroImageUrl =
    hero?.kind === "IMAGE" && hero.keyFull
      ? getPublicR2Url(hero.keyFull ?? "")
      : null;
  const heroVideoId =
    hero?.kind === "VIDEO" && hero.providerId ? hero.providerId : null;

  const defaults = getPillarCaseStudyDefaults(pillar.slug);
  const ctaCopy = project.ctaCopy ?? defaults.ctaCopy;
  const whoIsThisFor = project.whoIsThisFor ?? defaults.whoIsThisFor;
  const pageBackgroundMedia =
    project.backgroundMediaUrl ||
    hero?.keyFull ||
    hero?.keyThumb ||
    project.media
      .map((item) => item.media.keyFull || item.media.keyThumb)
      .find(Boolean) ||
    null;
  const pageBackgroundPoster =
    project.backgroundPosterUrl || hero?.posterKey || hero?.keyThumb || null;

  const serviceSlugs = getServiceSlugsForPillar(pillar.slug);
  const relatedServices = serviceSlugs
    .map((s) => services.find((svc) => svc.slug === s))
    .filter(Boolean) as typeof services;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Work",
        item: `${BRAND.url}/work`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: pillar.label,
        item: `${BRAND.url}/work/${pillarParam}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: project.title,
        item: `${BRAND.url}/work/${pillarParam}/${project.slug}`,
      },
    ],
  };

  const hasProjectFacts =
    project.client || project.projectType || project.scope;

  const hasEditorial = Boolean(
    project.opening?.trim() ||
      project.context?.trim() ||
      project.approach?.trim() ||
      project.highlight?.trim() ||
      project.execution?.trim() ||
      project.closing?.trim() ||
      project.credits?.trim()
  );

  const metaLine = [
    project.projectType || null,
    project.location || null,
    project.year != null ? String(project.year) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <PageBackground media={pageBackgroundMedia} poster={pageBackgroundPoster} />
      <div className="section-pad relative z-[2] mx-auto max-w-6xl px-6 lg:px-10">
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </script>

      <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-kicker">{pillar.label}</p>
          <h1 className="section-title">{project.title}</h1>
          {metaLine ? (
            <p className="mt-2 text-sm uppercase tracking-[0.3em] text-white/50">
              {metaLine}
            </p>
          ) : null}
        </div>
        <Link
          href={`/work/${pillarParam}`}
          className="btn btn-ghost"
        >
          Back to {pillar.label}
        </Link>
      </Reveal>

      {project.opening?.trim() ? (
        <Reveal className="mt-10">
          <div className="max-w-3xl text-lg leading-relaxed text-white/85">
            {project.opening.trim()}
          </div>
        </Reveal>
      ) : null}

      <Reveal className="mt-10">
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black image-guard-overlay">
          {heroVideoId ? (
            <VideoEmbed
              providerId={heroVideoId}
              posterKey={hero?.posterKey ?? undefined}
              title={project.title}
            />
          ) : heroImageUrl ? (
            <Image
              src={heroImageUrl}
              alt={hero?.alt ?? project.title}
              fill
              draggable={false}
              sizes="(min-width: 1280px) 1152px, (min-width: 1024px) calc(100vw - 80px), 100vw"
              quality={90}
              placeholder="blur"
              blurDataURL={BLUR_DATA}
              className="object-cover image-fade"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-black/80 text-white/40">
              <span className="text-sm uppercase tracking-[0.2em]">
                {project.title}
              </span>
            </div>
          )}
        </div>
      </Reveal>

      {hasProjectFacts && (
        <Reveal className="mt-10">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <p className="section-kicker">Project facts</p>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              {project.client && (
                <>
                  <dt className="text-white/50">Client</dt>
                  <dd className="text-white/80">{project.client}</dd>
                </>
              )}
              {project.projectType && (
                <>
                  <dt className="text-white/50">Project type</dt>
                  <dd className="text-white/80">{project.projectType}</dd>
                </>
              )}
              {project.scope && (
                <>
                  <dt className="text-white/50">Scope</dt>
                  <dd className="text-white/80">{project.scope}</dd>
                </>
              )}
              {project.location && (
                <>
                  <dt className="text-white/50">Location</dt>
                  <dd className="text-white/80">{project.location}</dd>
                </>
              )}
              {project.year != null && (
                <>
                  <dt className="text-white/50">Year</dt>
                  <dd className="text-white/80">{project.year}</dd>
                </>
              )}
            </dl>
          </div>
        </Reveal>
      )}

      {!hasEditorial &&
        (project.summary || project.description || project.overviewExtended) && (
        <Reveal className="mt-10">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <p className="section-kicker">Overview</p>
            <div className="mt-4 space-y-4 text-base text-white/80">
              <p>{project.summary ?? project.description}</p>
              {project.overviewExtended && <p>{project.overviewExtended}</p>}
            </div>
          </div>
        </Reveal>
      )}

      {!hasEditorial && project.whatWasPhotographed && (
        <Reveal className="mt-10">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <p className="section-kicker">What was photographed</p>
            <p className="mt-4 text-base text-white/80">
              {project.whatWasPhotographed}
            </p>
          </div>
        </Reveal>
      )}

      {!hasEditorial && project.visualApproach && (
        <Reveal className="mt-10">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <p className="section-kicker">Visual approach</p>
            <p className="mt-4 text-base text-white/80">
              {project.visualApproach}
            </p>
          </div>
        </Reveal>
      )}

      {!hasEditorial && project.locationContext && (
        <Reveal className="mt-10">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <p className="section-kicker">Location &amp; context</p>
            <p className="mt-4 text-base text-white/80">
              {project.locationContext}
            </p>
          </div>
        </Reveal>
      )}

      {hasEditorial && project.context?.trim() && (
        <Reveal className="mt-10">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <p className="section-kicker">Context</p>
            <p className="mt-4 text-base text-white/80 whitespace-pre-wrap">
              {project.context.trim()}
            </p>
          </div>
        </Reveal>
      )}

      {hasEditorial && project.approach?.trim() && (
        <Reveal className="mt-10">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <p className="section-kicker">Approach</p>
            <p className="mt-4 text-base text-white/80 whitespace-pre-wrap">
              {project.approach.trim()}
            </p>
          </div>
        </Reveal>
      )}

      {hasEditorial && project.highlight?.trim() && (
        <Reveal className="mt-10">
          <blockquote className="border-l-2 border-white/30 pl-6 text-xl font-display italic leading-snug text-white/90">
            {project.highlight.trim()}
          </blockquote>
        </Reveal>
      )}

      {whoIsThisFor && (
        <Reveal className="mt-10">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <p className="section-kicker">Who this photography serves</p>
            <p className="mt-4 text-base text-white/80">{whoIsThisFor}</p>
          </div>
        </Reveal>
      )}

      {project.media.length > 0 && (
        <div className="mt-12">
          <Reveal>
            <h2 className="font-display text-2xl text-white">Gallery</h2>
            <p className="mt-2 text-sm text-white/70">
              Selected imagery from the project. Click any image to view full size.
            </p>
          </Reveal>
          <WorkProjectGallery
            projectTitle={project.title}
            projectLocation={project.location}
            media={project.media}
            heroMediaId={project.heroMedia?.id ?? undefined}
          />
        </div>
      )}

      {hasEditorial && project.execution?.trim() && (
        <Reveal className="mt-12">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <p className="section-kicker">Execution</p>
            <p className="mt-4 text-base text-white/80 whitespace-pre-wrap">
              {project.execution.trim()}
            </p>
          </div>
        </Reveal>
      )}

      {hasEditorial && project.closing?.trim() && (
        <Reveal className="mt-12">
          <p className="text-center text-lg text-white/80">{project.closing.trim()}</p>
        </Reveal>
      )}

      {hasEditorial && project.credits?.trim() && (
        <Reveal className="mt-12">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <p className="section-kicker">Credits</p>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-white/60">
              {project.credits.trim()}
            </p>
          </div>
        </Reveal>
      )}

      <Reveal className="mt-12">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
          <p className="section-kicker">Related services</p>
          <p className="mt-2 text-sm text-white/70">
            This project is part of our{" "}
            <Link
              href={getPillarSeoServiceUrl(pillar.slug)}
              className="text-white underline hover:no-underline"
            >
              {getPillarSeoLinkPhrase(pillar.slug)}
            </Link>
            .{" "}
            {relatedServices.length > 0
              ? "Looking for similar photography in your area?"
              : null}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {relatedServices.map((svc) => (
              <Link
                key={svc.slug}
                href={`/services/${svc.slug}`}
                className="btn btn-ghost text-white/80 hover:text-white"
              >
                {svc.title}
              </Link>
            ))}
            <Link href="/contact" className="btn btn-ghost text-white/80 hover:text-white">
              Contact
            </Link>
          </div>
        </div>
      </Reveal>

      <Reveal className="mt-12">
        <div className="rounded-2xl border border-white/10 bg-black/60 p-6">
          <p className="section-kicker">Next step</p>
          <h2 className="font-display text-2xl text-white">
            Ready to collaborate?
          </h2>
          <p className="mt-3 text-sm text-white/70">{ctaCopy}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/contact" className="btn btn-solid">
              Request availability
            </Link>
            <Link
              href="/process"
              className="btn btn-ghost text-white/80 hover:text-white"
            >
              How we work
            </Link>
          </div>
        </div>
      </Reveal>
      </div>
    </>
  );
}
