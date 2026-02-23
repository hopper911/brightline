import type { Metadata } from "next";
import Link from "next/link";
import VideoEmbed from "@/components/VideoEmbed";
import Image from "next/image";
import { notFound } from "next/navigation";
import Reveal from "@/components/Reveal";
import {
  isValidSectionSlug,
  SECTION_TITLES,
  SECTIONS,
  slugToSection,
  type SectionSlug,
} from "@/lib/config/sections";
import { getPublishedProjectsBySection } from "@/lib/queries/work";
import { getPublicR2Url } from "@/lib/r2";

export const revalidate = 300;

const BLUR_DATA =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iNyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iI2U4ZTllYSIvPjwvc3ZnPg==";

export async function generateStaticParams() {
  return [
    { section: "acd" },
    { section: "rea" },
    { section: "cul" },
    { section: "biz" },
    { section: "tri" },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  if (!isValidSectionSlug(section)) {
    return { title: "Section · Bright Line Photography" };
  }
  const title = `${SECTION_TITLES[section as SectionSlug]} · Bright Line Photography`;
  return {
    title,
    description: `Commercial photography projects in ${SECTION_TITLES[section as SectionSlug]}.`,
    alternates: { canonical: `/work/${section}` },
    openGraph: { title, url: `/work/${section}` },
  };
}

export default async function WorkSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section: sectionParam } = await params;
  if (!isValidSectionSlug(sectionParam)) {
    notFound();
  }
  const section = sectionParam as SectionSlug;
  const sectionTitle = SECTION_TITLES[section];
  const config = SECTIONS.find((s) => s.slug === section);
  const workSection = slugToSection(section);

  const projects = await getPublishedProjectsBySection(workSection);

  return (
    <div className="section-pad mx-auto max-w-6xl px-6 lg:px-10">
      <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-kicker">Work</p>
          <h1 className="section-title">{sectionTitle}</h1>
          <p className="section-subtitle">
            {config?.description ?? `Commercial photography projects.`}
          </p>
        </div>
        <Link href="/work" className="btn btn-ghost">
          Back to work
        </Link>
      </Reveal>

      {config?.featuredReelId && (
        <Reveal className="mt-10">
          <p className="mb-4 text-xs uppercase tracking-[0.3em] text-white/50">
            Featured reel
          </p>
          <div className="max-w-3xl">
            <VideoEmbed
              providerId={config.featuredReelId}
              title={`${sectionTitle} featured video`}
            />
          </div>
        </Reveal>
      )}

      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => {
          const hero = project.heroMedia;
          const heroImageUrl =
            hero?.kind === "IMAGE" && hero.keyFull
              ? getPublicR2Url(hero.keyFull)
              : null;
          const heroVideoId =
            hero?.kind === "VIDEO" && hero.providerId ? hero.providerId : null;

          return (
            <Reveal key={project.id}>
              <Link
                href={`/work/${section}/${project.slug}`}
                className="group block overflow-hidden rounded-2xl border border-white/10 bg-black/40 lift-card"
              >
                <div className="relative h-[240px] w-full overflow-hidden">
                  {hero?.kind === "VIDEO" && hero.posterKey ? (
                    <>
                      <Image
                        src={getPublicR2Url(hero.posterKey)}
                        alt={project.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
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
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
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
                  <h2 className="text-lg text-white group-hover:text-white">
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
      </div>

      {projects.length === 0 && (
        <Reveal className="mt-12 rounded-2xl border border-white/10 bg-black/40 p-12 text-center">
          <p className="text-white/70">No published projects in this section yet.</p>
          <Link href="/work" className="btn btn-ghost mt-4">
            Back to work
          </Link>
        </Reveal>
      )}
    </div>
  );
}
