import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import AssignedPageBackground from "@/components/AssignedPageBackground";
import Reveal from "@/components/Reveal";
import { pageKeyWorkSection } from "@/lib/page-backgrounds";
import StudioProjectCaseStudy from "@/components/studio/StudioProjectCaseStudy";
import { BRAND } from "@/lib/config/brand";
import {
  getPillarBySlug,
  getSectionToPillarSlugMap,
  isDualBrandHub,
  isKnownPillarSlug,
  resolvePillarCoverUrl,
} from "@/lib/work-pillar-settings";
import { getFeaturedHeroForSection, getPublishedProjectsBySections } from "@/lib/queries/work";
import { getPublicR2FullBleedUrl, getPublicR2Url } from "@/lib/r2";
import { normalizeProjectSlug } from "@/lib/slugify";
import {
  getAdjacentPublishedStudioProjects,
  getPublishedStudioProjectForPublicBySlug,
  getPublishedStudioProjectMetaBySlug,
  listPublishedStudioProjectsForWorkPillar,
} from "@/lib/studio/studio-project-cms";
import type { WorkSection } from "@prisma/client";
import {
  dualBrandMediaSrc,
  dualBrandWorkHref,
  fetchDualBrandWork,
  type DualBrandWorkProject,
} from "@/lib/dual-brand/content-api";

export const revalidate = 60;

const BLUR_DATA =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iNyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iI2U4ZTllYSIvPjwvc3ZnPg==";

const LEGACY_WORK_SECTION_REDIRECTS: Record<string, string> = {
  acd: "advertising",
  cul: "advertising",
  rea: "commercial",
  tri: "commercial",
  biz: "corporate",
  architecture: "commercial",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  if (await isKnownPillarSlug(section)) {
    const pillar = await getPillarBySlug(section);
    if (!pillar) return { title: "Work · BRIGHTLINE Photography" };
    const title = `${pillar.label} · BRIGHTLINE Photography`;
    return {
      title,
      description: pillar.description,
      alternates: { canonical: `/work/${section}` },
      openGraph: { title, url: `/work/${section}` },
    };
  }

  const proj = await getPublishedStudioProjectMetaBySlug(normalizeProjectSlug(section));
  if (!proj) {
    return { title: "Work · BRIGHTLINE Photography" };
  }

  const title = proj.seoTitle?.trim()
    ? `${proj.seoTitle.trim()} | ${BRAND.name}`
    : `${proj.title} | ${BRAND.name}`;
  const description =
    proj.seoDescription?.trim() ??
    (proj.opening?.trim() ? proj.opening.trim().slice(0, 160) : null) ??
    `${proj.title} — ${proj.category} photography.`;
  const canonicalUrl = `${BRAND.url}/work/${proj.slug}`;

  let ogImageUrl = `${BRAND.url}/og-image.svg`;
  const hero = proj.heroImage;
  if (hero?.kind === "IMAGE" && hero.keyFull) {
    ogImageUrl = getPublicR2Url(hero.keyFull);
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

function ProjectGrid({
  workProjects,
  studioTiles,
  getProjectHref,
}: {
  workProjects: Awaited<ReturnType<typeof getPublishedProjectsBySections>>;
  studioTiles?: Awaited<ReturnType<typeof listPublishedStudioProjectsForWorkPillar>>;
  getProjectHref: (project: (typeof workProjects)[0]) => string;
}) {
  const studio = studioTiles ?? [];
  const showStudio = studio.length > 0;
  const showWork = workProjects.length > 0;

  const grid = (
    <>
      {workProjects.map((project) => {
        const hero = project.heroMedia;
        const heroImageUrl =
          hero?.kind === "IMAGE" && (hero.keyFull ?? hero.keyThumb)
            ? getPublicR2FullBleedUrl(hero.keyFull ?? hero.keyThumb ?? "")
            : null;
        const heroVideoId =
          hero?.kind === "VIDEO" && hero.providerId ? hero.providerId : null;

        return (
          <Reveal key={project.id}>
            <Link
              href={getProjectHref(project)}
              className="group block overflow-hidden rounded-xl border border-white/10 bg-black/40 lift-card"
            >
              <div className="relative h-[240px] w-full overflow-hidden image-guard-overlay">
                {hero?.kind === "VIDEO" && hero.posterKey ? (
                  <>
                    <Image
                      src={getPublicR2Url(hero.posterKey ?? "")}
                      alt={project.title}
                      fill
                      draggable={false}
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      quality={85}
                      placeholder="blur"
                      blurDataURL={BLUR_DATA}
                      className="object-cover image-zoom"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/80 text-white">
                        <svg
                          className="ml-1 h-5 w-5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </>
                ) : heroVideoId ? (
                  <div className="flex h-full w-full items-center justify-center bg-black/60">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/50 text-white/70">
                      <svg
                        className="ml-1 h-6 w-6"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <span className="sr-only">Video: {project.title}</span>
                  </div>
                ) : heroImageUrl ? (
                  <Image
                    src={heroImageUrl}
                    alt={hero?.alt ?? project.title}
                    fill
                    draggable={false}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    quality={85}
                    placeholder="blur"
                    blurDataURL={BLUR_DATA}
                    className="object-cover image-zoom"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-black/60 text-white/40">
                    <span className="text-xs uppercase tracking-[0.2em]">
                      {project.title}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-5">
                <h2 className="text-base text-white group-hover:text-white">
                  {project.title}
                </h2>
                {project.summary && (
                  <p className="mt-2 line-clamp-2 text-sm text-white/70">
                    {project.summary}
                  </p>
                )}
                {(project.location || project.year) && (
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/50">
                    {[project.location, project.year].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            </Link>
          </Reveal>
        );
      })}
      {showStudio
        ? studio.map((tile) => {
            const hero = tile.heroImage;
            const heroImageUrl =
              hero?.kind === "IMAGE" && (hero.keyFull ?? hero.keyThumb)
                ? getPublicR2FullBleedUrl(hero.keyFull ?? hero.keyThumb ?? "")
                : null;

            return (
              <Reveal key={`studio_${tile.id}`}>
                <Link
                  href={`/work/${encodeURIComponent(tile.slug)}`}
                  className="group block overflow-hidden rounded-xl border border-white/10 bg-black/40 lift-card"
                >
                  <div className="relative h-[240px] w-full overflow-hidden image-guard-overlay">
                    {heroImageUrl ? (
                      <Image
                        src={heroImageUrl}
                        alt={hero?.alt ?? tile.title}
                        fill
                        draggable={false}
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        quality={85}
                        placeholder="blur"
                        blurDataURL={BLUR_DATA}
                        className="object-cover image-zoom"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-black/60 text-white/40">
                        <span className="text-xs uppercase tracking-[0.2em]">
                          {tile.title}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h2 className="text-base text-white group-hover:text-white">
                      {tile.title}
                    </h2>
                    {tile.summary && (
                      <p className="mt-2 line-clamp-2 text-sm text-white/70">
                        {tile.summary}
                      </p>
                    )}
                    {(tile.location || tile.year) && (
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/50">
                        {[tile.location, tile.year].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                </Link>
              </Reveal>
            );
          })
        : null}
    </>
  );

  if (!showWork && !showStudio) return null;

  return (
    <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {grid}
    </div>
  );
}

function WorkUpdatingFallback() {
  return (
    <div className="section-pad mx-auto max-w-6xl px-6 lg:px-10">
      <Reveal className="rounded-2xl border border-white/10 bg-black/40 p-12 text-center">
        <h1 className="section-title">Work is updating</h1>
        <p className="mt-4 text-white/70">Please check back shortly.</p>
        <Link href="/work" className="btn btn-ghost mt-6">
          Back to work
        </Link>
      </Reveal>
    </div>
  );
}

async function DualBrandHubContent({
  pillar,
}: {
  pillar: NonNullable<Awaited<ReturnType<typeof getPillarBySlug>>>;
}) {
  const projects = await fetchDualBrandWork();
  const firstCover =
    dualBrandMediaSrc(
      projects.find((p) => p.heroImage || p.thumbnailImage)?.heroImage ||
        projects.find((p) => p.thumbnailImage)?.thumbnailImage ||
        null
    ) || null;
  const coverMedia = resolvePillarCoverUrl(pillar.coverImageKey, firstCover);

  return (
    <>
      <AssignedPageBackground
        pageKey={pageKeyWorkSection(pillar.slug)}
        fallbackMedia={coverMedia}
      />
      <div className="section-pad relative z-[2] mx-auto max-w-6xl px-6 lg:px-10">
        <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="section-kicker">Work</p>
            <h1 className="section-title">{pillar.label}</h1>
            <p className="section-subtitle">{pillar.description}</p>
          </div>
          <Link href="/work" className="btn btn-ghost">
            Back to work
          </Link>
        </Reveal>

        {projects.length > 0 ? (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project: DualBrandWorkProject) => {
              const heroUrl =
                dualBrandMediaSrc(project.heroImage) ||
                dualBrandMediaSrc(project.thumbnailImage) ||
                null;
              return (
                <Reveal key={project.id}>
                  <Link
                    href={dualBrandWorkHref(project)}
                    className="group block overflow-hidden rounded-xl border border-white/10 bg-black/40 lift-card"
                  >
                    <div className="relative h-[240px] w-full overflow-hidden image-guard-overlay">
                      {heroUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={heroUrl}
                          alt={project.title}
                          draggable={false}
                          className="h-full w-full object-cover image-zoom"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-black/60 text-white/40">
                          <span className="text-xs uppercase tracking-[0.2em]">
                            {project.title}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <p className="text-[0.65rem] uppercase tracking-[0.3em] text-white/50">
                        Collaboration
                      </p>
                      <h2 className="mt-2 text-base text-white">{project.title}</h2>
                      <p className="mt-2 line-clamp-2 text-sm text-white/70">{project.summary}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/50">
                        {project.year}
                      </p>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        ) : (
          <Reveal className="mt-12 rounded-2xl border border-white/10 bg-black/40 p-12 text-center">
            <p className="text-white/70">No shared Mirotech projects published to Brightline yet.</p>
            <Link href="/work" className="btn btn-ghost mt-4">
              Back to work
            </Link>
          </Reveal>
        )}
      </div>
    </>
  );
}

async function PillarSectionContent({ section }: { section: string }) {
  if (!(await isKnownPillarSlug(section))) notFound();
  const pillar = await getPillarBySlug(section);
  if (!pillar || pillar.visible === false) notFound();

  if (isDualBrandHub(pillar)) {
    return <DualBrandHubContent pillar={pillar} />;
  }

  let sectionMap: Awaited<ReturnType<typeof getSectionToPillarSlugMap>>;
  try {
    sectionMap = await getSectionToPillarSlugMap();
  } catch {
    notFound();
  }

  let projects: Awaited<ReturnType<typeof getPublishedProjectsBySections>>;
  let studioTiles: Awaited<ReturnType<typeof listPublishedStudioProjectsForWorkPillar>> = [];
  try {
    projects = await getPublishedProjectsBySections(pillar.sections);
  } catch {
    return <WorkUpdatingFallback />;
  }
  try {
    studioTiles = await listPublishedStudioProjectsForWorkPillar(pillar.slug);
  } catch {
    studioTiles = [];
  }

  let coverMedia = resolvePillarCoverUrl(pillar.coverImageKey, null);
  if (!coverMedia?.trim()) {
    const firstSection = pillar.sections[0];
    if (firstSection) {
      try {
        const hero = await getFeaturedHeroForSection(firstSection);
        if (hero?.kind === "IMAGE" && (hero.keyFull ?? hero.keyThumb)) {
          coverMedia = getPublicR2FullBleedUrl(hero.keyFull ?? hero.keyThumb ?? "");
        }
      } catch {
        /* keep null */
      }
    }
  }

  return (
    <>
      <AssignedPageBackground
        pageKey={pageKeyWorkSection(pillar.slug)}
        fallbackMedia={coverMedia}
      />
      <div className="section-pad relative z-[2] mx-auto max-w-6xl px-6 lg:px-10">
      <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-kicker">Work</p>
          <h1 className="section-title">{pillar.label}</h1>
          <p className="section-subtitle">{pillar.description}</p>
        </div>
        <Link href="/work" className="btn btn-ghost">
          Back to work
        </Link>
      </Reveal>

      <ProjectGrid
        workProjects={projects}
        studioTiles={studioTiles}
        getProjectHref={(project) => {
          const pillarSlug = sectionMap[project.section as WorkSection];
          return `/work/${pillarSlug}/${project.slug}`;
        }}
      />

      {projects.length === 0 && studioTiles.length === 0 && (
        <Reveal className="mt-12 rounded-2xl border border-white/10 bg-black/40 p-12 text-center">
          <p className="text-white/70">No published projects in this pillar yet.</p>
          <Link href="/work" className="btn btn-ghost mt-4">
            Back to work
          </Link>
        </Reveal>
      )}
    </div>
    </>
  );
}

/**
 * `/work/[section]` — pillar index (`architecture` | `advertising` | `corporate`) or
 * a published Studio CMS project at `/work/{slug}` (slugs must not collide with pillar names).
 */
export default async function WorkSectionOrStudioPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const legacyPillar = LEGACY_WORK_SECTION_REDIRECTS[section.toLowerCase()];
  if (legacyPillar) {
    permanentRedirect(`/work/${legacyPillar}`);
  }

  if (await isKnownPillarSlug(section)) {
    return <PillarSectionContent section={section} />;
  }

  const project = await getPublishedStudioProjectForPublicBySlug(section);
  if (!project) {
    notFound();
  }

  const adjacent = await getAdjacentPublishedStudioProjects(project.slug);
  return <StudioProjectCaseStudy project={project} adjacent={adjacent} />;
}
