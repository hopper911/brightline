import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Reveal from "@/components/Reveal";
import GalleryLightbox from "@/components/GalleryLightbox";
import { getProjectBySlug, getProjects } from "@/lib/content";
import PrimaryCTA from "@/components/PrimaryCTA";

const BLUR_DATA =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iNyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iI2U4ZTllYSIvPjwvc3ZnPg==";

export function generateStaticParams() {
  return getProjects().map((item) => ({ segment: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ segment: string }>;
}): Promise<Metadata> {
  const { segment } = await params;
  const project = getProjectBySlug(segment);
  if (!project) {
    return {
      title: "Project · Bright Line Photography",
      description: "Commercial photography case study.",
    };
  }

  const title = `${project.title} · Bright Line Photography`;
  const description = project.overview || `${project.category} photography for ${project.title}. ${project.location}, ${project.year}.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/work/${project.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `/work/${project.slug}`,
      images: [{ url: project.cover, width: 1200, height: 630, alt: project.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [project.cover],
    },
  };
}

export default async function WorkSegmentPage({
  params,
}: {
  params: Promise<{ segment: string }>;
}) {
  const { segment } = await params;
  const project = getProjectBySlug(segment);
  if (!project) {
    notFound();
  }

  const goals = project.goals.length
    ? project.goals
    : [
        "Define a clear visual direction for the campaign.",
        "Capture hero imagery and detail-driven supporting frames.",
        "Deliver assets optimized for web, social, and print.",
      ];

  const deliverables = project.deliverables.length
    ? project.deliverables
    : [
        "Hero campaign selects",
        "Supporting detail imagery",
        "Multi-channel crop set",
      ];

  const results =
    project.results ||
    "Delivered a polished image library tailored for launch campaigns, sales materials, and ongoing content marketing.";

  return (
    <div className="section-pad mx-auto max-w-6xl px-6 lg:px-10">
      <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-black/50">
            {project.category}
          </p>
          <h1 className="section-title mt-4">{project.title}</h1>
          <p className="mt-2 text-sm uppercase tracking-[0.3em] text-black/50">
            {project.location} · {project.year}
          </p>
        </div>
        <Link
          href="/work"
          className="btn btn-ghost"
        >
          Back to work
        </Link>
      </Reveal>

      <div className="mt-10 grid gap-8 md:grid-cols-[1.2fr_0.8fr]">
        <Reveal className="relative h-[420px] w-full overflow-hidden rounded-2xl border border-black/10 bg-white/80">
          <Image
            src={project.cover}
            alt={project.title}
            fill
            sizes="(min-width: 1024px) 640px, 100vw"
            placeholder="blur"
            blurDataURL={BLUR_DATA}
            className="object-cover image-fade"
          />
        </Reveal>

        <Reveal className="rounded-2xl border border-black/10 bg-white/80 p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-black/50">
            Overview
          </p>
          <p className="mt-4 text-sm text-black/70">{project.overview}</p>
        </Reveal>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Reveal className="rounded-2xl border border-black/10 bg-white/80 p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-black/50">
            Goals
          </p>
          <ul className="mt-4 space-y-2 text-sm text-black/70">
            {goals.map((goal) => (
              <li key={goal} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-white/60" />
                <span>{goal}</span>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal className="rounded-2xl border border-black/10 bg-white/80 p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-black/50">
            Deliverables
          </p>
          <ul className="mt-4 space-y-2 text-sm text-black/70">
            {deliverables.map((deliverable) => (
              <li key={deliverable} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-white/60" />
                <span>{deliverable}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>

      {project.gallery.length > 0 ? (
        <div className="mt-12">
          <Reveal>
            <h2 className="font-display text-2xl text-black">Gallery</h2>
            <p className="mt-2 text-sm text-black/70">
              Curated selects from the project.
            </p>
          </Reveal>
          <div className="mt-6">
            <GalleryLightbox images={project.gallery} title={project.title} />
          </div>
        </div>
      ) : null}

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <Reveal className="rounded-2xl border border-black/10 bg-white/80 p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-black/50">
            Results
          </p>
          <p className="mt-4 text-sm text-black/70">{results}</p>
        </Reveal>
        <Reveal className="rounded-[24px] border border-black/10 bg-black/60 p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">
            Ready to collaborate?
          </p>
          <p className="mt-4 text-sm text-white/70">{project.cta}</p>
          <PrimaryCTA service={project.categorySlug} className="btn btn-solid mt-6" />
        </Reveal>
      </div>
    </div>
  );
}
