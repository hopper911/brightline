import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import WorkProjectGallery from "@/components/WorkProjectGallery";
import GalleryBlocks from "@/components/gallery/GalleryBlocks";
import StoryChapters from "@/components/story/StoryChapters";
import PageBackground from "@/components/PageBackground";
import { BRAND } from "@/lib/config/brand";
import type { StudioProjectWithHeroAndGallery } from "@/lib/studio/studio-project-cms";
import { resolveFullBleedMediaUrl } from "@/lib/r2";
import {
  buildWorkGalleryPool,
  resolveWorkGalleryBlocks,
} from "@/lib/work-gallery-blocks";
import { cleanStoryChapters } from "@/lib/story-chapters";

const BLUR_DATA =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iNyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iI2U4ZTllYSIvPjwvc3ZnPg==";

type Adjacent = {
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
};

type Props = {
  project: StudioProjectWithHeroAndGallery;
  adjacent: Adjacent;
};

export default function StudioProjectCaseStudy({ project, adjacent }: Props) {
  const hero = project.heroImage;
  const heroImageUrl =
    hero?.kind === "IMAGE" && (hero.keyFull || hero.keyThumb)
      ? resolveFullBleedMediaUrl(hero.keyFull ?? hero.keyThumb ?? "")
      : null;

  const metaLine = [project.category, project.subcategory, project.location, String(project.year)]
    .filter(Boolean)
    .join(" · ");

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
        name: project.title,
        item: `${BRAND.url}/work/${project.slug}`,
      },
    ],
  };

  const mediaForGallery = project.galleryMedia.map((g, i) => ({
    mediaId: g.mediaId,
    sortOrder: g.sortOrder ?? i,
    media: g.media,
  }));

  const hasGalleryImages = mediaForGallery.some(
    (item) =>
      item.media.kind === "IMAGE" && (item.media.keyFull || item.media.keyThumb)
  );
  const storyPool = buildWorkGalleryPool(mediaForGallery, null);
  const storyChapters = cleanStoryChapters(project.storyChapters);
  const useStories = storyChapters.length > 0;
  const galleryPool = buildWorkGalleryPool(mediaForGallery, project.heroImageId);
  const galleryBlocks = resolveWorkGalleryBlocks(
    project.galleryBlocks,
    project.galleryCarouselEnabled,
    galleryPool
  );
  const pageBackgroundMedia =
    resolveFullBleedMediaUrl(
      project.backgroundMediaUrl ||
        hero?.keyFull ||
        hero?.keyThumb ||
        mediaForGallery
          .map((item) => item.media.keyFull || item.media.keyThumb)
          .find(Boolean) ||
        null
    ) || null;
  const pageBackgroundPoster = project.backgroundPosterUrl || hero?.posterKey || hero?.keyThumb || null;

  if (useStories) {
    return (
      <>
        <PageBackground media={pageBackgroundMedia} poster={pageBackgroundPoster} />
        <article className="section-pad relative z-[2] mx-auto max-w-6xl px-6 lg:px-10">
          <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
          <Reveal className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="section-title">{project.title}</h1>
            </div>
            <Link href="/work" className="btn btn-ghost shrink-0">
              Back to work
            </Link>
          </Reveal>
          <StoryChapters
            chapters={storyChapters}
            pool={storyPool}
            resolveHeroUrl={(mediaId) => {
              const item = storyPool.find((p) => p.id === mediaId);
              return item ? { src: item.src, alt: item.alt } : null;
            }}
          />
          {(adjacent.prev || adjacent.next) && (
            <nav
              className="mt-16 flex flex-col gap-4 border-t border-white/10 pt-10 sm:flex-row sm:justify-between"
              aria-label="Adjacent projects"
            >
              {adjacent.prev ? (
                <Link
                  href={`/work/${adjacent.prev.slug}`}
                  className="group text-left text-sm text-white/70 transition hover:text-white"
                >
                  <span className="block text-xs uppercase tracking-[0.25em] text-white/40">Previous</span>
                  <span className="mt-1 font-medium text-white/90 group-hover:underline">
                    {adjacent.prev.title}
                  </span>
                </Link>
              ) : (
                <span />
              )}
              {adjacent.next ? (
                <Link
                  href={`/work/${adjacent.next.slug}`}
                  className="group text-right text-sm text-white/70 transition hover:text-white sm:ml-auto"
                >
                  <span className="block text-xs uppercase tracking-[0.25em] text-white/40">Next</span>
                  <span className="mt-1 font-medium text-white/90 group-hover:underline">
                    {adjacent.next.title}
                  </span>
                </Link>
              ) : null}
            </nav>
          )}
        </article>
      </>
    );
  }

  return (
    <>
      <PageBackground
        media={pageBackgroundMedia}
        poster={pageBackgroundPoster}
      />
      <article className="section-pad relative z-[2] mx-auto max-w-6xl px-6 lg:px-10">
      <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>

      <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="section-title">{project.title}</h1>
          {metaLine ? (
            <p className="mt-2 text-sm uppercase tracking-[0.3em] text-white/50">{metaLine}</p>
          ) : null}
        </div>
        <Link href="/work" className="btn btn-ghost shrink-0">
          Back to work
        </Link>
      </Reveal>

      {project.opening?.trim() ? (
        <Reveal className="mt-10">
          <p className="max-w-3xl text-lg leading-relaxed text-white/85">{project.opening.trim()}</p>
        </Reveal>
      ) : null}

      <Reveal className="mt-10">
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black image-guard-overlay">
          {heroImageUrl ? (
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
            <div className="flex h-full min-h-[200px] w-full items-center justify-center bg-black/80 text-white/40">
              <span className="text-sm uppercase tracking-[0.2em]">{project.title}</span>
            </div>
          )}
        </div>
      </Reveal>

      {project.context?.trim() ? (
        <Reveal className="mt-14">
          <p className="section-kicker">Context</p>
          <div className="mt-4 max-w-3xl whitespace-pre-wrap text-base leading-relaxed text-white/80">
            {project.context.trim()}
          </div>
        </Reveal>
      ) : null}

      {project.approach?.trim() ? (
        <Reveal className="mt-14">
          <p className="section-kicker">Approach</p>
          <div className="mt-4 max-w-3xl whitespace-pre-wrap text-base leading-relaxed text-white/80">
            {project.approach.trim()}
          </div>
        </Reveal>
      ) : null}

      {project.highlight?.trim() ? (
        <Reveal className="mt-14">
          <blockquote className="max-w-3xl border-l-2 border-white/30 pl-6 text-xl font-display italic leading-snug text-white/90">
            {project.highlight.trim()}
          </blockquote>
        </Reveal>
      ) : null}

      {galleryBlocks.length > 0 || hasGalleryImages ? (
        <div className="mt-14">
          {galleryBlocks.length > 0 ? (
            <GalleryBlocks
              blocks={galleryBlocks}
              pool={galleryPool}
              showSectionHeading
              sectionHint="Use arrows to browse. Click an image for full size."
            />
          ) : hasGalleryImages ? (
            <Reveal>
              <p className="section-kicker">Gallery</p>
              <WorkProjectGallery
                projectTitle={project.title}
                projectLocation={project.location}
                media={mediaForGallery}
                heroMediaId={project.heroImageId}
              />
            </Reveal>
          ) : null}
        </div>
      ) : null}

      {project.execution?.trim() ? (
        <Reveal className="mt-14">
          <p className="section-kicker">Execution</p>
          <div className="mt-4 max-w-3xl whitespace-pre-wrap text-base leading-relaxed text-white/80">
            {project.execution.trim()}
          </div>
        </Reveal>
      ) : null}

      {project.closing?.trim() ? (
        <Reveal className="mt-14">
          <p className="max-w-3xl text-center text-lg text-white/80">{project.closing.trim()}</p>
        </Reveal>
      ) : null}

      {project.credits?.trim() ? (
        <Reveal className="mt-14">
          <p className="section-kicker">Credits</p>
          <div className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-white/60">
            {project.credits.trim()}
          </div>
        </Reveal>
      ) : null}

      {(adjacent.prev || adjacent.next) && (
        <nav
          className="mt-16 flex flex-col gap-4 border-t border-white/10 pt-10 sm:flex-row sm:justify-between"
          aria-label="Adjacent projects"
        >
          {adjacent.prev ? (
            <Link
              href={`/work/${adjacent.prev.slug}`}
              className="group text-left text-sm text-white/70 transition hover:text-white"
            >
              <span className="block text-xs uppercase tracking-[0.25em] text-white/40">Previous</span>
              <span className="mt-1 font-medium text-white/90 group-hover:underline">
                {adjacent.prev.title}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {adjacent.next ? (
            <Link
              href={`/work/${adjacent.next.slug}`}
              className="group text-right text-sm text-white/70 transition hover:text-white sm:ml-auto"
            >
              <span className="block text-xs uppercase tracking-[0.25em] text-white/40">Next</span>
              <span className="mt-1 font-medium text-white/90 group-hover:underline">
                {adjacent.next.title}
              </span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
      </article>
    </>
  );
}
