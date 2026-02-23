import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Reveal from "@/components/Reveal";
import VideoEmbed from "@/components/VideoEmbed";
import {
  isValidSectionSlug,
  SECTION_TITLES,
  slugToSection,
  type SectionSlug,
} from "@/lib/config/sections";
import { getProjectBySectionAndSlug } from "@/lib/queries/work";
import { getPublishedProjectsBySection } from "@/lib/queries/work";
import { getPublicR2Url } from "@/lib/r2";
import { BRAND } from "@/lib/config/brand";

export const revalidate = 300;

const BLUR_DATA =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iNyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iI2U4ZTllYSIvPjwvc3ZnPg==";

export async function generateStaticParams() {
  const sections = ["acd", "rea", "cul", "biz", "tri"] as const;
  const params: { section: string; projectSlug: string }[] = [];
  for (const slug of sections) {
    try {
      const projects = await getPublishedProjectsBySection(
        slugToSection(slug as SectionSlug)
      );
      for (const p of projects) {
        params.push({ section: slug, projectSlug: p.slug });
      }
    } catch {
      // DB may not be available at build time
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string; projectSlug: string }>;
}): Promise<Metadata> {
  const { section, projectSlug } = await params;
  if (!isValidSectionSlug(section)) {
    return { title: "Project · Bright Line Photography" };
  }
  const project = await getProjectBySectionAndSlug(
    slugToSection(section as SectionSlug),
    projectSlug
  );
  if (!project) {
    return { title: "Project · Bright Line Photography" };
  }

  const title = `${project.title} · Bright Line Photography`;
  const description =
    project.summary ?? project.description ?? `${project.title} photography project.`;
  const canonicalUrl = `/work/${section}/${projectSlug}`;

  let ogImageUrl = `${BRAND.url}/og-image.svg`;
  const hero = project.heroMedia;
  if (hero?.kind === "IMAGE" && hero.keyFull) {
    ogImageUrl = getPublicR2Url(hero.keyFull);
  } else if (hero?.kind === "VIDEO" && hero.posterKey) {
    ogImageUrl = getPublicR2Url(hero.posterKey);
  }

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: `${BRAND.url}${canonicalUrl}`,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: project.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function WorkProjectPage({
  params,
}: {
  params: Promise<{ section: string; projectSlug: string }>;
}) {
  const { section: sectionParam, projectSlug } = await params;
  if (!isValidSectionSlug(sectionParam)) {
    notFound();
  }
  const section = sectionParam as SectionSlug;
  const sectionTitle = SECTION_TITLES[section];

  const project = await getProjectBySectionAndSlug(
    slugToSection(section),
    projectSlug
  );
  if (!project) {
    notFound();
  }

  const hero = project.heroMedia;
  const heroImageUrl =
    hero?.kind === "IMAGE" && hero.keyFull
      ? getPublicR2Url(hero.keyFull)
      : null;
  const heroVideoId =
    hero?.kind === "VIDEO" && hero.providerId ? hero.providerId : null;

  return (
    <div className="section-pad mx-auto max-w-6xl px-6 lg:px-10">
      <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-kicker">{sectionTitle}</p>
          <h1 className="section-title">{project.title}</h1>
          {(project.location || project.year) && (
            <p className="mt-2 text-sm uppercase tracking-[0.3em] text-white/50">
              {[project.location, project.year].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <Link
          href={`/work/${section}`}
          className="btn btn-ghost"
        >
          Back to {sectionTitle}
        </Link>
      </Reveal>

      <Reveal className="mt-10">
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
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
              sizes="(min-width: 1024px) 960px, 100vw"
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

      {(project.summary || project.description) && (
        <Reveal className="mt-10">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
            <p className="section-kicker">Overview</p>
            <p className="mt-4 text-base text-white/80">
              {project.summary ?? project.description}
            </p>
          </div>
        </Reveal>
      )}

      {project.media.length > 0 && (
        <div className="mt-12">
          <Reveal>
            <h2 className="font-display text-2xl text-white">Gallery</h2>
            <p className="mt-2 text-sm text-white/70">
              Selected imagery from the project.
            </p>
          </Reveal>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {project.media.map(({ media, sortOrder }) =>
              media.kind === "VIDEO" && media.providerId ? (
                <Reveal key={`${media.id}-${sortOrder}`}>
                  <VideoEmbed
                    providerId={media.providerId}
                    posterKey={media.posterKey ?? undefined}
                    title={media.alt ?? project.title}
                  />
                </Reveal>
              ) : media.kind === "IMAGE" && media.keyFull ? (
                <Reveal key={`${media.id}-${sortOrder}`}>
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
                    <Image
                      src={getPublicR2Url(media.keyFull)}
                      alt={media.alt ?? project.title}
                      fill
                      sizes="(min-width: 640px) 50vw, 100vw"
                      placeholder="blur"
                      blurDataURL={BLUR_DATA}
                      className="object-cover image-fade"
                    />
                  </div>
                </Reveal>
              ) : null
            )}
          </div>
        </div>
      )}

      <Reveal className="mt-12">
        <div className="rounded-2xl border border-white/10 bg-black/60 p-6">
          <p className="section-kicker">Next step</p>
          <h2 className="font-display text-2xl text-white">
            Ready to collaborate?
          </h2>
          <p className="mt-3 text-sm text-white/70">
            Share your timeline and vision and we&apos;ll craft a tailored
            proposal.
          </p>
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
  );
}
