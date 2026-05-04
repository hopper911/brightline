import type { Metadata } from "next";
import Link from "next/link";
import PageBackground from "@/components/PageBackground";
import Reveal from "@/components/Reveal";
import { getFeaturedHeroForSection } from "@/lib/queries/work";
import { getPublicR2Url } from "@/lib/r2";
import {
  listFeaturedPublishedStudioProjectsForHub,
  type PublishedStudioTileForWorkPillar,
} from "@/lib/studio/studio-project-cms";
import {
  getBackgroundMediaFromPage,
  getPublishedWebsitePageBySlug,
  type WebsitePage,
} from "@/lib/website-pages";
import { getVisibleWorkPillars, resolvePillarCoverUrl } from "@/lib/work-pillar-settings";

/** Full-bleed hero when the Work “Website pages” entry has no hero media (avoids an empty PageBackground). */
function resolveWorkIndexBackground(
  workPage: WebsitePage | null,
  homePage: WebsitePage | null,
  featured: PublishedStudioTileForWorkPillar[],
  pillarCoverUrls: (string | null)[]
): { media: string | null; poster: string | null } {
  const fromWork = getBackgroundMediaFromPage(workPage);
  if (fromWork.media?.trim()) return fromWork;

  const fromHome = getBackgroundMediaFromPage(homePage);
  if (fromHome.media?.trim()) return fromHome;

  const hero = featured[0]?.heroImage;
  if (hero?.kind === "IMAGE" && (hero.keyFull ?? hero.keyThumb)) {
    return {
      media: getPublicR2Url(hero.keyFull ?? hero.keyThumb ?? ""),
      poster: null,
    };
  }

  const cover = pillarCoverUrls.find((u) => u?.trim());
  if (cover) return { media: cover, poster: null };

  return { media: null, poster: null };
}

export const dynamic = "force-dynamic";

async function fetchPillarData() {
  const pillars = await getVisibleWorkPillars();
  return Promise.all(
    pillars.map(async (pillar) => {
      const firstSection = pillar.sections[0];
      const hero = firstSection
        ? await getFeaturedHeroForSection(firstSection)
        : null;
      let autoCover: string | null = null;
      let defaultAlt: string | null = null;
      if (hero?.kind === "IMAGE" && (hero.keyFull ?? hero.keyThumb)) {
        autoCover = getPublicR2Url(hero.keyFull ?? hero.keyThumb ?? "");
        defaultAlt = hero.alt ?? pillar.label;
      }
      const coverUrl =
        resolvePillarCoverUrl(pillar.coverImageKey, autoCover) ?? autoCover;
      const coverAlt =
        pillar.coverAlt.trim() ? pillar.coverAlt.trim() : (defaultAlt ?? pillar.label);
      return {
        slug: pillar.slug,
        label: pillar.label,
        description: pillar.description,
        homeMeta: pillar.homeMeta,
        coverUrl,
        coverAlt,
        sections: pillar.sections,
      };
    })
  );
}

export const metadata: Metadata = {
  title: "Work · BRIGHTLINE Photography",
  description:
    "Architecture, advertising, and corporate photography—projects and case studies with structured, channel-ready delivery.",
  alternates: { canonical: "/work" },
  openGraph: {
    title: "Work · BRIGHTLINE Photography",
    description:
      "Architecture, advertising, and corporate photography—projects and case studies.",
    url: "/work",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "BRIGHTLINE Photography" }],
  },
};

export default async function WorkIndexPage() {
  const [publishedWorkPage, publishedHomePage, featuredStudioProjects] = await Promise.all([
    getPublishedWebsitePageBySlug("work"),
    getPublishedWebsitePageBySlug("home"),
    listFeaturedPublishedStudioProjectsForHub(),
  ]);
  let pillarData: Awaited<ReturnType<typeof fetchPillarData>>;
  try {
    pillarData = await fetchPillarData();
  } catch {
    const pillars = await getVisibleWorkPillars();
    pillarData = pillars.map((p) => ({
      slug: p.slug,
      label: p.label,
      description: p.description,
      homeMeta: p.homeMeta,
      coverUrl: resolvePillarCoverUrl(p.coverImageKey, null),
      coverAlt: p.coverAlt.trim() ? p.coverAlt.trim() : p.label,
      sections: p.sections,
    }));
  }

  const { media, poster } = resolveWorkIndexBackground(
    publishedWorkPage,
    publishedHomePage,
    featuredStudioProjects,
    pillarData.map((p) => p.coverUrl)
  );

  return (
    <>
      <PageBackground media={media} poster={poster} />
      <div className="section-pad relative z-[2] mx-auto max-w-6xl px-6 lg:px-10">
        <Reveal>
          <p className="section-kicker">Work</p>
          <h1 className="section-title">Case studies</h1>
          <p className="section-subtitle">
            Architecture, advertising, and corporate—visuals prepared for how teams actually use them.
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
                    ? getPublicR2Url(hero.keyFull ?? hero.keyThumb ?? "")
                    : null;

                return (
                  <Reveal key={project.id}>
                    <Link
                      href={`/work/${encodeURIComponent(project.slug)}`}
                      className="group block overflow-hidden rounded-xl border border-white/10 bg-black/40 lift-card"
                    >
                      <div className="relative h-[220px] w-full">
                        {heroUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={heroUrl}
                            alt={hero?.alt ?? project.title}
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

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pillarData.map((pillar) => (
            <Reveal key={pillar.slug}>
              <Link
                href={`/work/${pillar.slug}`}
                className="group block overflow-hidden rounded-xl border border-white/10 bg-black/40 lift-card"
              >
                <div className="relative h-[200px] w-full">
                  {pillar.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pillar.coverUrl}
                      alt={pillar.coverAlt ?? pillar.label}
                      className="h-full w-full object-cover image-zoom"
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
      </div>
    </>
  );
}
