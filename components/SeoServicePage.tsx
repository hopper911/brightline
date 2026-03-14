import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { getPublicR2Url } from "@/lib/r2";
import {
  getProjectHref,
  type SeoServicePageConfig,
} from "@/lib/seoServicePages";
import type { WorkSection } from "@prisma/client";

const BLUR_DATA =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iNyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iI2U4ZTllYSIvPjwvc3ZnPg==";

type Project = Awaited<
  ReturnType<typeof import("@/lib/queries/work").getPublishedProjectsBySections>
>[number];

function ProjectGrid({
  projects,
}: {
  projects: Project[];
}) {
  return (
    <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => {
        const hero = project.heroMedia;
        const heroImageUrl =
          hero?.kind === "IMAGE" && (hero.keyThumb ?? hero.keyFull)
            ? getPublicR2Url(hero.keyThumb ?? hero.keyFull ?? "")
            : null;
        const heroVideoId =
          hero?.kind === "VIDEO" && hero.providerId ? hero.providerId : null;
        const href = getProjectHref(project.section as WorkSection, project.slug);

        return (
          <Reveal key={project.id}>
            <Link
              href={href}
              className="group block overflow-hidden rounded-xl border border-white/10 bg-black/40 lift-card"
            >
              <div className="relative h-[240px] w-full overflow-hidden">
                {hero?.kind === "VIDEO" && hero.posterKey ? (
                  <>
                    <Image
                      src={getPublicR2Url(hero.posterKey ?? "")}
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
    </div>
  );
}

type SeoServicePageProps = {
  config: SeoServicePageConfig;
  projects: Project[];
};

export default function SeoServicePage({ config, projects }: SeoServicePageProps) {
  return (
    <div className="section-pad mx-auto max-w-6xl px-6 lg:px-10">
      <Reveal>
        <h1 className="section-title">{config.h1}</h1>
        <p className="mt-4 text-lg text-white/80">{config.intro}</p>
      </Reveal>

      <Reveal className="mt-12">
        <p className="section-kicker">Who hires us</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {config.clientTypes.map((item) => (
            <li
              key={item}
              className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-white/80"
            >
              {item}
            </li>
          ))}
        </ul>
      </Reveal>

      {projects.length > 0 && (
        <Reveal className="mt-12">
          <p className="section-kicker">Featured projects</p>
          <p className="mt-2 text-sm text-white/70">
            Selected work from our portfolio.{" "}
            <Link href="/work" className="text-white underline hover:no-underline">
              View all work
            </Link>
          </p>
          <ProjectGrid projects={projects} />
        </Reveal>
      )}

      <Reveal className="mt-12">
        <p className="section-kicker">Locations served</p>
        <p className="mt-2 text-sm text-white/70">
          {config.locations.join(", ")}
        </p>
      </Reveal>

      <Reveal className="mt-12">
        <div className="rounded-2xl border border-white/10 bg-black/60 p-8">
          <p className="section-kicker">Next step</p>
          <h2 className="font-display text-2xl text-white">
            {config.ctaHeadline}
          </h2>
          <p className="mt-3 text-sm text-white/70">{config.ctaSubtext}</p>
          <div className="mt-6">
            <Link href="/contact" className="btn btn-solid">
              Request a quote
            </Link>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
