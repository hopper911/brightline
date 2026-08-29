import type { Metadata } from "next";
import Link from "next/link";
import AssignedPageBackground from "@/components/AssignedPageBackground";
import Reveal from "@/components/Reveal";
import { getPublicR2CardUrl, getPublicR2FullBleedUrl } from "@/lib/r2";
import {
  listFeaturedPublishedStudioProjectsForHub,
  type PublishedStudioTileForWorkPillar,
} from "@/lib/studio/studio-project-cms";
import {
  getBackgroundMediaFromPage,
  getPublishedWebsitePageBySlug,
  type WebsitePage,
} from "@/lib/website-pages";
import { getVisibleWorkPillars, isDualBrandHub } from "@/lib/work-pillar-settings";
import DesignEntryBand from "@/components/DesignEntryBand";
import {
  dualBrandWorkHref,
  dualBrandMediaCardSrc,
} from "@/lib/dual-brand/content-api";
import {
  buildVisiblePillarCovers,
  dualBrandCoverFallbacks,
} from "@/lib/pillar-cover-data";
import {
  getPublicDualBrandWork,
  PUBLIC_PAGE_REVALIDATE_SECONDS,
} from "@/lib/public-chrome-cache";

/** Full-bleed hero when the Work “Website pages” entry has no hero media (avoids an empty PageBackground). */
function resolveWorkIndexBackground(
  workPage: WebsitePage | null,
  homePage: WebsitePage | null,
  featured: PublishedStudioTileForWorkPillar[],
  pillarBleedCoverUrls: (string | null)[]
): { media: string | null; poster: string | null } {
  const fromWork = getBackgroundMediaFromPage(workPage);
  if (fromWork.media?.trim()) return fromWork;

  const fromHome = getBackgroundMediaFromPage(homePage);
  if (fromHome.media?.trim()) return fromHome;

  const hero = featured[0]?.heroImage;
  if (hero?.kind === "IMAGE" && (hero.keyFull ?? hero.keyThumb)) {
    return {
      media: getPublicR2FullBleedUrl(hero.keyFull ?? hero.keyThumb ?? ""),
      poster: null,
    };
  }

  const cover = pillarBleedCoverUrls.find((u) => u?.trim());
  if (cover) return { media: cover, poster: null };

  return { media: null, poster: null };
}

export const revalidate = PUBLIC_PAGE_REVALIDATE_SECONDS;

export const metadata: Metadata = {
  title: "Work · BRIGHTLINE Photography",
  description:
    "Commercial, advertising, and corporate photography—selected case studies with structured, channel-ready delivery.",
  alternates: { canonical: "/work" },
  openGraph: {
    title: "Work · BRIGHTLINE Photography",
    description:
      "Commercial, advertising, and corporate photography—selected case studies.",
    url: "/work",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "BRIGHTLINE Photography" }],
  },
};

export default async function WorkIndexPage() {
  const [publishedWorkPage, publishedHomePage, featuredStudioProjects, dualBrandProjects] =
    await Promise.all([
      getPublishedWebsitePageBySlug("work"),
      getPublishedWebsitePageBySlug("home"),
      listFeaturedPublishedStudioProjectsForHub(),
      getPublicDualBrandWork(),
    ]);
  const dualBrandCovers = dualBrandCoverFallbacks(dualBrandProjects);

  let pillarData: Awaited<ReturnType<typeof buildVisiblePillarCovers>>;
  try {
    pillarData = await buildVisiblePillarCovers({
      dualBrandCoverCardFallback: dualBrandCovers.card,
      dualBrandCoverBleedFallback: dualBrandCovers.bleed,
    });
  } catch {
    const pillars = await getVisibleWorkPillars();
    pillarData = pillars.map((p) => ({
      slug: p.slug,
      label: p.label,
      description: p.description,
      homeMeta: p.homeMeta,
      coverUrl: "/images/hero.jpg",
      coverBleedUrl: "/images/hero.jpg",
      coverAlt: p.coverAlt.trim() ? p.coverAlt.trim() : p.label,
      sections: p.sections,
      hub: p.hub,
    }));
  }

  const hasDualBrandHubCard = pillarData.some((p) => p.hub === "dual-brand");
  const showCollaborations = dualBrandProjects.length > 0 && !hasDualBrandHubCard;

  const { media, poster } = resolveWorkIndexBackground(
    publishedWorkPage,
    publishedHomePage,
    featuredStudioProjects,
    pillarData.map((p) => p.coverBleedUrl)
  );

  return (
    <>
      <AssignedPageBackground pageKey="work" fallbackMedia={media} fallbackPoster={poster} />
      <div className="section-pad relative z-[2] mx-auto max-w-6xl px-6 lg:px-10">
        <Reveal>
          <p className="section-kicker">Work</p>
          <h1 className="section-title">Case studies</h1>
          <p className="section-subtitle">
            Commercial, advertising, and corporate—selected case studies prepared for how teams actually use them.
          </p>
        </Reveal>

        {featuredStudioProjects.length > 0 ? (
          <section className="mt-12">
            <Reveal>
              <div>
                <p className="section-kicker">Featured</p>
                <h2 className="font-display text-3xl text-white sm:text-4xl">
                  Featured case studies
                </h2>
              </div>
            </Reveal>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featuredStudioProjects.map((project) => {
                const hero = project.heroImage;
                const heroUrl =
                  hero?.kind === "IMAGE" && (hero.keyFull ?? hero.keyThumb)
                    ? getPublicR2CardUrl(hero.keyThumb ?? hero.keyFull ?? "")
                    : null;

                return (
                  <Reveal key={project.id}>
                    <Link
                      href={`/work/${encodeURIComponent(project.slug)}`}
                      className="group block overflow-hidden rounded-xl border border-white/10 bg-black/40 lift-card"
                    >
                      <div className="relative h-[200px] w-full image-guard-overlay">
                        {heroUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={heroUrl}
                            alt={project.title}
                            draggable={false}
                            className="h-full w-full object-cover image-zoom"
                            loading="lazy"
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
                          Case study
                        </p>
                        <h3 className="mt-2 text-base text-white group-hover:text-white">
                          {project.title}
                        </h3>
                        {project.summary ? (
                          <p className="mt-2 line-clamp-2 text-sm text-white/70">
                            {project.summary}
                          </p>
                        ) : null}
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
            </div>
          </section>
        ) : null}

        {showCollaborations ? (
          <section className="mt-12">
            <Reveal>
              <div>
                <p className="section-kicker">Collaborations</p>
                <h2 className="font-display text-3xl text-white sm:text-4xl">
                  Shared projects
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-white/60">
                  Photo-forward case studies also published through the dual-brand CMS.
                </p>
              </div>
            </Reveal>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {dualBrandProjects.map((project) => {
                const heroUrl =
                  dualBrandMediaCardSrc(project.thumbnailImage) ||
                  dualBrandMediaCardSrc(project.heroImage) ||
                  null;
                return (
                  <Reveal key={project.id}>
                    <Link
                      href={dualBrandWorkHref(project)}
                      className="group block overflow-hidden rounded-xl border border-white/10 bg-black/40 lift-card"
                    >
                      <div className="relative h-[200px] w-full image-guard-overlay">
                        {heroUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={heroUrl}
                            alt={project.title}
                            draggable={false}
                            className="h-full w-full object-cover image-zoom"
                            loading="lazy"
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
                        <h3 className="mt-2 text-base text-white">{project.title}</h3>
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
          </section>
        ) : null}

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pillarData.map((pillar) => (
            <Reveal key={pillar.slug}>
              <Link
                href={`/work/${pillar.slug}`}
                className="group block overflow-hidden rounded-xl border border-white/10 bg-black/40 lift-card"
              >
                <div className="relative h-[200px] w-full image-guard-overlay">
                  {pillar.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pillar.coverUrl}
                      alt={pillar.coverAlt ?? pillar.label}
                      draggable={false}
                      className="h-full w-full object-cover image-zoom"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-black/60 text-white/40">
                      <span className="text-xs uppercase tracking-[0.2em]">
                        {pillar.label}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <p className="text-[0.65rem] uppercase tracking-[0.3em] text-white/50">
                    {pillar.label}
                  </p>
                  {pillar.homeMeta ? (
                    <p className="mt-1 line-clamp-2 text-xs text-white/60">{pillar.homeMeta}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-white/80 group-hover:text-white">
                    View projects →
                  </p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>

        <DesignEntryBand variant="work" />
      </div>
    </>
  );
}
