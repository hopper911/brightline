import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Reveal from "@/components/Reveal";
import VideoEmbed from "@/components/VideoEmbed";
import { getPillarBySlug, isPillarSlug } from "@/lib/portfolioPillars";
import { getProjectByPillarAndSlug } from "@/lib/queries/work";
import { getGridImageUrl, getPublicR2Url } from "@/lib/r2";
import { BRAND } from "@/lib/config/brand";

export const dynamic = "force-dynamic";

const BLUR_DATA =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iNyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iI2U4ZTllYSIvPjwvc3ZnPg==";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string; projectSlug: string }>;
}): Promise<Metadata> {
  const { section, projectSlug } = await params;
  if (!isPillarSlug(section)) {
    return { title: "Project · Bright Line Photography" };
  }
  let proj;
  try {
    proj = await getProjectByPillarAndSlug(section, projectSlug);
  } catch {
    return { title: "Work · Bright Line Photography" };
  }
  if (!proj) {
    return { title: "Project · Bright Line Photography" };
  }

  const title = `${proj.title} · Bright Line Photography`;
  const description =
    proj.summary ?? proj.description ?? `${proj.title} photography project.`;
  const canonicalUrl = `/work/${section}/${projectSlug}`;

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
      url: `${BRAND.url}${canonicalUrl}`,
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

  if (!isPillarSlug(pillarParam)) {
    notFound();
  }

  const pillar = getPillarBySlug(pillarParam);
  if (!pillar) notFound();

  let project;
  try {
    project = await getProjectByPillarAndSlug(pillarParam, projectSlug);
  } catch {
    return <WorkUpdatingFallback />;
  }
  if (!project) {
    notFound();
  }

  const hero = project.heroMedia;
  const heroImageUrl =
    hero?.kind === "IMAGE"
      ? getGridImageUrl(hero.keyFull, hero.keyThumb) || null
      : null;
  const heroVideoId =
    hero?.kind === "VIDEO" && hero.providerId ? hero.providerId : null;

  return (
    <div className="section-pad mx-auto max-w-6xl px-6 lg:px-10">
      <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-kicker">{pillar.label}</p>
          <h1 className="section-title">{project.title}</h1>
          {(project.location || project.year) && (
            <p className="mt-2 text-sm uppercase tracking-[0.3em] text-white/50">
              {[project.location, project.year].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <Link
          href={`/work/${pillarParam}`}
          className="btn btn-ghost"
        >
          Back to {pillar.label}
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
              sizes="(min-width: 640px) 960px, 100vw"
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
              ) : media.kind === "IMAGE" && (media.keyFull || media.keyThumb) ? (
                <Reveal key={`${media.id}-${sortOrder}`}>
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
                    <Image
                      src={getGridImageUrl(media.keyFull, media.keyThumb)}
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
