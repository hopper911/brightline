import Image from "next/image";
import Link from "next/link";
import AssignedPageBackground from "@/components/AssignedPageBackground";
import Reveal from "@/components/Reveal";
import VideoEmbed from "@/components/VideoEmbed";
import WorkProjectGallery from "@/components/WorkProjectGallery";
import GalleryBlocks from "@/components/gallery/GalleryBlocks";
import StoryChapters from "@/components/story/StoryChapters";
import { BRAND } from "@/lib/config/brand";
import { pageKeyWorkProject } from "@/lib/page-backgrounds";
import { getPillarCaseStudyDefaults } from "@/lib/pillarCaseStudyDefaults";
import { getPillarSeoLinkPhrase, getPillarSeoServiceUrl } from "@/lib/pillarToSeoServiceUrl";
import { getServiceSlugsForPillar } from "@/lib/pillarToServices";
import { parseRelatedServiceLinks } from "@/lib/work-project-related-services";
import { resolveFullBleedMediaUrl } from "@/lib/r2";
import { services } from "@/app/services/data";
import type { WorkProjectCaseStudyData } from "@/lib/queries/work";
import {
  buildWorkGalleryPool,
  resolveWorkGalleryBlocks,
} from "@/lib/work-gallery-blocks";
import { cleanStoryChapters } from "@/lib/story-chapters";

const BLUR_DATA =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iNyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iI2U4ZTllYSIvPjwvc3ZnPg==";

type Props = {
  project: WorkProjectCaseStudyData;
  pillarSlug: string;
  pillarLabel: string;
  /** When false, omit JSON-LD (admin preview). Default true. */
  includeSchema?: boolean;
};

/**
 * Public Work case study layout — used by `/work/[pillar]/[slug]` and admin draft preview.
 * Renders whatever fields exist; missing sections stay hidden.
 */
export default function WorkProjectCaseStudy({
  project,
  pillarSlug,
  pillarLabel,
  includeSchema = true,
}: Props) {
  const hero = project.heroMedia;
  const heroImageUrl =
    hero?.kind === "IMAGE" && hero.keyFull
      ? resolveFullBleedMediaUrl(hero.keyFull)
      : hero?.kind === "IMAGE" && hero.keyThumb
        ? resolveFullBleedMediaUrl(hero.keyThumb)
        : null;
  const heroVideoId = hero?.kind === "VIDEO" && hero.providerId ? hero.providerId : null;

  const defaults = getPillarCaseStudyDefaults(pillarSlug);
  const whoIsThisFor = project.whoIsThisFor ?? defaults.whoIsThisFor;
  const pageBackgroundMedia =
    resolveFullBleedMediaUrl(
      project.backgroundMediaUrl ||
        hero?.keyFull ||
        hero?.keyThumb ||
        project.media
          .map((item) => item.media.keyFull || item.media.keyThumb)
          .find(Boolean) ||
        null
    ) || null;
  const pageBackgroundPoster =
    project.backgroundPosterUrl || hero?.posterKey || hero?.keyThumb || null;

  const serviceSlugs = getServiceSlugsForPillar(pillarSlug);
  const defaultRelatedServices = serviceSlugs
    .map((s) => services.find((svc) => svc.slug === s))
    .filter(Boolean) as typeof services;
  const customRelatedLinks = parseRelatedServiceLinks(project.relatedServicesLinks);
  const relatedServices =
    customRelatedLinks.length > 0
      ? customRelatedLinks.map((link) => {
          const match = services.find((svc) => svc.slug === link.slug);
          return { slug: link.slug, title: link.title || match?.title || link.slug };
        })
      : defaultRelatedServices.map((svc) => ({ slug: svc.slug, title: svc.title }));
  const relatedServicesEnabled = project.relatedServicesEnabled !== false;
  const showRelatedContactButton = project.showRelatedContactButton !== false;

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
        name: pillarLabel,
        item: `${BRAND.url}/work/${pillarSlug}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: project.title,
        item: `${BRAND.url}/work/${pillarSlug}/${project.slug}`,
      },
    ],
  };

  const hasProjectFacts = project.client || project.projectType || project.scope;

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

  const galleryPool = buildWorkGalleryPool(project.media, null);
  const storyChapters = cleanStoryChapters(project.storyChapters);
  const useStories = storyChapters.length > 0;

  const classicPool = buildWorkGalleryPool(project.media, project.heroMedia?.id);
  const galleryBlocks = resolveWorkGalleryBlocks(
    project.galleryBlocks,
    project.galleryCarouselEnabled,
    classicPool
  );
  const hasVideos = project.media.some(
    (row) =>
      row.media.kind === "VIDEO" &&
      row.media.id !== project.heroMedia?.id &&
      (row.media.providerId || row.media.keyFull)
  );

  function relatedServicesBlock() {
    if (!relatedServicesEnabled) return null;
    return (
      <Reveal className="mt-12">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
          <p className="section-kicker">Related services</p>
          {project.relatedServicesIntro?.trim() ? (
            <p className="mt-2 text-sm text-white/70">{project.relatedServicesIntro.trim()}</p>
          ) : (
            <p className="mt-2 text-sm text-white/70">
              This project is part of our{" "}
              <Link
                href={getPillarSeoServiceUrl(pillarSlug)}
                className="text-white underline hover:no-underline"
              >
                {getPillarSeoLinkPhrase(pillarSlug)}
              </Link>
              .{" "}
              {relatedServices.length > 0
                ? "Looking for similar photography in your area?"
                : null}
            </p>
          )}
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
            {showRelatedContactButton ? (
              <Link href="/contact" className="btn btn-ghost text-white/80 hover:text-white">
                Contact
              </Link>
            ) : null}
          </div>
        </div>
      </Reveal>
    );
  }

  if (useStories) {
    return (
      <>
        <AssignedPageBackground
          pageKey={pageKeyWorkProject(project.slug)}
          fallbackMedia={pageBackgroundMedia}
          fallbackPoster={pageBackgroundPoster}
        />
        <div className="section-pad relative z-[2] mx-auto max-w-6xl px-6 lg:px-10">
          {includeSchema ? (
            <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
          ) : null}
          <Reveal className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="section-kicker">{pillarLabel}</p>
              <h1 className="section-title">{project.title || "Untitled project"}</h1>
            </div>
            <Link href={`/work/${pillarSlug}`} className="btn btn-ghost">
              Back to {pillarLabel}
            </Link>
          </Reveal>
          <StoryChapters
            chapters={storyChapters}
            pool={galleryPool}
            resolveHeroUrl={(mediaId) => {
              const item = galleryPool.find((p) => p.id === mediaId);
              return item ? { src: item.src, alt: item.alt } : null;
            }}
          />
          {relatedServicesBlock()}
        </div>
      </>
    );
  }

  return (
    <>
      <AssignedPageBackground
        pageKey={pageKeyWorkProject(project.slug)}
        fallbackMedia={pageBackgroundMedia}
        fallbackPoster={pageBackgroundPoster}
      />
      <div className="section-pad relative z-[2] mx-auto max-w-6xl px-6 lg:px-10">
        {includeSchema ? (
          <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        ) : null}

        <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="section-kicker">{pillarLabel}</p>
            <h1 className="section-title">{project.title || "Untitled project"}</h1>
            {metaLine ? (
              <p className="mt-2 text-sm uppercase tracking-[0.3em] text-white/50">{metaLine}</p>
            ) : null}
          </div>
          <Link href={`/work/${pillarSlug}`} className="btn btn-ghost">
            Back to {pillarLabel}
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
                  {project.title || "No hero image yet"}
                </span>
              </div>
            )}
          </div>
        </Reveal>

        {hasProjectFacts ? (
          <Reveal className="mt-10">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
              <p className="section-kicker">Project facts</p>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                {project.client ? (
                  <>
                    <dt className="text-white/50">Client</dt>
                    <dd className="text-white/80">{project.client}</dd>
                  </>
                ) : null}
                {project.projectType ? (
                  <>
                    <dt className="text-white/50">Project type</dt>
                    <dd className="text-white/80">{project.projectType}</dd>
                  </>
                ) : null}
                {project.scope ? (
                  <>
                    <dt className="text-white/50">Scope</dt>
                    <dd className="text-white/80">{project.scope}</dd>
                  </>
                ) : null}
                {project.location ? (
                  <>
                    <dt className="text-white/50">Location</dt>
                    <dd className="text-white/80">{project.location}</dd>
                  </>
                ) : null}
                {project.year != null ? (
                  <>
                    <dt className="text-white/50">Year</dt>
                    <dd className="text-white/80">{project.year}</dd>
                  </>
                ) : null}
              </dl>
            </div>
          </Reveal>
        ) : null}

        {!hasEditorial &&
        (project.summary || project.description || project.overviewExtended) ? (
          <Reveal className="mt-10">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
              <p className="section-kicker">Overview</p>
              <div className="mt-4 space-y-4 text-base text-white/80">
                <p>{project.summary ?? project.description}</p>
                {project.overviewExtended ? <p>{project.overviewExtended}</p> : null}
              </div>
            </div>
          </Reveal>
        ) : null}

        {!hasEditorial && project.whatWasPhotographed ? (
          <Reveal className="mt-10">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
              <p className="section-kicker">What was photographed</p>
              <p className="mt-4 text-base text-white/80">{project.whatWasPhotographed}</p>
            </div>
          </Reveal>
        ) : null}

        {!hasEditorial && project.visualApproach ? (
          <Reveal className="mt-10">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
              <p className="section-kicker">Visual approach</p>
              <p className="mt-4 text-base text-white/80">{project.visualApproach}</p>
            </div>
          </Reveal>
        ) : null}

        {!hasEditorial && project.locationContext ? (
          <Reveal className="mt-10">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
              <p className="section-kicker">Location &amp; context</p>
              <p className="mt-4 text-base text-white/80">{project.locationContext}</p>
            </div>
          </Reveal>
        ) : null}

        {hasEditorial && project.context?.trim() ? (
          <Reveal className="mt-10">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
              <p className="section-kicker">Context</p>
              <p className="mt-4 whitespace-pre-wrap text-base text-white/80">
                {project.context.trim()}
              </p>
            </div>
          </Reveal>
        ) : null}

        {hasEditorial && project.approach?.trim() ? (
          <Reveal className="mt-10">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
              <p className="section-kicker">Approach</p>
              <p className="mt-4 whitespace-pre-wrap text-base text-white/80">
                {project.approach.trim()}
              </p>
            </div>
          </Reveal>
        ) : null}

        {hasEditorial && project.highlight?.trim() ? (
          <Reveal className="mt-10">
            <blockquote className="border-l-2 border-white/30 pl-6 font-display text-xl italic leading-snug text-white/90">
              {project.highlight.trim()}
            </blockquote>
          </Reveal>
        ) : null}

        {whoIsThisFor ? (
          <Reveal className="mt-10">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
              <p className="section-kicker">Who this photography serves</p>
              <p className="mt-4 text-base text-white/80">{whoIsThisFor}</p>
            </div>
          </Reveal>
        ) : null}

        {galleryBlocks.length > 0 || hasVideos ? (
          <div className="mt-12">
            {galleryBlocks.length > 0 ? (
              <GalleryBlocks blocks={galleryBlocks} pool={classicPool} />
            ) : null}
            {hasVideos ? (
              <div className={galleryBlocks.length > 0 ? "mt-10" : undefined}>
                {!galleryBlocks.length ? (
                  <Reveal>
                    <h2 className="font-display text-2xl text-white">Gallery</h2>
                  </Reveal>
                ) : null}
                <WorkProjectGallery
                  projectTitle={project.title}
                  projectLocation={project.location}
                  media={project.media}
                  heroMediaId={project.heroMedia?.id ?? undefined}
                  videosOnly
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {hasEditorial && project.execution?.trim() ? (
          <Reveal className="mt-12">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
              <p className="section-kicker">Execution</p>
              <p className="mt-4 whitespace-pre-wrap text-base text-white/80">
                {project.execution.trim()}
              </p>
            </div>
          </Reveal>
        ) : null}

        {hasEditorial && project.closing?.trim() ? (
          <Reveal className="mt-12">
            <p className="text-center text-lg text-white/80">{project.closing.trim()}</p>
          </Reveal>
        ) : null}

        {hasEditorial && project.credits?.trim() ? (
          <Reveal className="mt-12">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
              <p className="section-kicker">Credits</p>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-white/60">
                {project.credits.trim()}
              </p>
            </div>
          </Reveal>
        ) : null}

        {relatedServicesBlock()}
      </div>
    </>
  );
}
