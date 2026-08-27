import Link from "next/link";
import Reveal from "@/components/Reveal";
import PublicInlineVideo from "@/components/PublicInlineVideo";
import { extractPrototypeUrl } from "@/lib/dual-brand/case-study-template";
import { mirotechSiteOrigin } from "@/lib/mirotech-site";
import { isVideoMediaKey } from "@/lib/portfolio-web-full";
import { getPublicR2Url } from "@/lib/r2";

export type SharedWorkProjectViewModel = {
  title: string;
  slug: string;
  subtitle?: string | null;
  summary: string;
  year?: number | null;
  role?: string | null;
  disciplines?: string[];
  categories?: string[];
  tools?: string[];
  platforms?: string[];
  publishMirotech?: boolean;
  heroImage?: string | null;
  thumbnailImage?: string | null;
  photoNarrative?: {
    overview?: string | null;
    approach?: string | null;
    location?: string | null;
    notes?: string | null;
  } | null;
  challenge?: string | null;
  outcome?: string | null;
  /** Optional override; defaults to Mirotech /work/{slug}. */
  mirotechWorkUrl?: string | null;
  prototypeUrl?: string | null;
};

function resolveHeroSrc(value?: string | null): string {
  const v = value?.trim() || "";
  if (!v) return "";
  if (/^(https?:|data:|blob:)/i.test(v) || v.startsWith("/")) return v;
  return getPublicR2Url(v.replace(/^\/+/, ""));
}

function heroPosterSrc(heroRef?: string | null): string | undefined {
  const raw = heroRef?.trim() || "";
  if (!raw || !isVideoMediaKey(raw)) return undefined;
  if (/-poster\.(webp|png)/i.test(raw)) return resolveHeroSrc(raw);
  const poster = raw.replace(/\.(mp4|webm|mov|m4v)(\?.*)?$/i, "-poster.webp");
  if (poster !== raw) return resolveHeroSrc(poster);
  return undefined;
}

/**
 * Brightline “shared collaboration” case study body (used by public + admin preview).
 * Keeps photo narrative; product depth lives on Mirotech — companion band links out.
 */
export default function SharedWorkProjectView({
  project,
  previewBanner = false,
}: {
  project: SharedWorkProjectViewModel;
  previewBanner?: boolean;
}) {
  const narrative = project.photoNarrative;
  const heroRef = project.heroImage || project.thumbnailImage || "";
  const hero = resolveHeroSrc(heroRef);
  const heroIsVideo = Boolean(hero && isVideoMediaKey(heroRef));
  const hasNarrative = Boolean(
    narrative?.overview?.trim() || narrative?.approach?.trim() || narrative?.notes?.trim()
  );
  const hasDesign = Boolean(project.challenge?.trim() || project.outcome?.trim());
  const metaBits = [
    narrative?.location?.trim() || null,
    project.year != null && project.year > 0 ? String(project.year) : null,
    project.role?.trim() || null,
    project.disciplines?.slice(0, 3).join(" · ") || null,
  ].filter(Boolean);

  const prototypeUrl =
    project.prototypeUrl?.trim() || extractPrototypeUrl(project.platforms) || "";
  const mirotechWorkUrl =
    project.mirotechWorkUrl?.trim() ||
    `${mirotechSiteOrigin()}/work/${encodeURIComponent(project.slug)}`;
  const showProductBand = Boolean(
    project.summary?.trim() || prototypeUrl || project.publishMirotech !== false
  );

  return (
    <article className="section-pad relative z-10 mx-auto max-w-3xl px-6 lg:px-10">
      {previewBanner ? (
        <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          Admin preview — not the public URL. Publish on Brightline Work to make{" "}
          <code className="text-amber-50">/work/shared/{project.slug}</code> live.
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-white/15 bg-black/55 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <div className="px-6 py-10 sm:px-8 sm:py-12">
          <Reveal>
            <p className="section-kicker">
              <Link href="/work" className="text-white/60 no-underline hover:text-white">
                Work
              </Link>
              {" · "}Shared
              {previewBanner ? " · Preview" : ""}
            </p>
            <h1 className="section-title mt-3 text-white">{project.title}</h1>
            {project.subtitle ? (
              <p className="mt-3 text-lg text-white/70">{project.subtitle}</p>
            ) : null}
            <p className="section-subtitle mt-4 text-white/80">{project.summary}</p>
            {metaBits.length > 0 ? (
              <p className="mt-5 text-xs uppercase tracking-[0.2em] text-white/50">
                {metaBits.join(" · ")}
              </p>
            ) : null}
          </Reveal>

          {hero ? (
            <Reveal className="mt-10">
              {heroIsVideo ? (
                <PublicInlineVideo
                  src={hero}
                  poster={heroPosterSrc(heroRef)}
                  alt={project.title}
                  className="aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black"
                  videoClassName="h-full w-full object-cover"
                  hideControlsMobile={false}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={hero}
                  alt={project.title}
                  className="w-full rounded-xl border border-white/10 object-cover"
                />
              )}
            </Reveal>
          ) : null}

          <div className="mt-12 space-y-10">
            {narrative?.overview ? (
              <Reveal>
                <h2 className="font-display text-2xl text-white">Overview</h2>
                <p className="mt-3 whitespace-pre-wrap text-white/75 leading-relaxed">
                  {narrative.overview}
                </p>
              </Reveal>
            ) : null}
            {narrative?.approach ? (
              <Reveal>
                <h2 className="font-display text-2xl text-white">Approach</h2>
                <p className="mt-3 whitespace-pre-wrap text-white/75 leading-relaxed">
                  {narrative.approach}
                </p>
              </Reveal>
            ) : null}
            {narrative?.notes ? (
              <Reveal>
                <h2 className="font-display text-2xl text-white">Notes</h2>
                <p className="mt-3 whitespace-pre-wrap text-white/75 leading-relaxed">
                  {narrative.notes}
                </p>
              </Reveal>
            ) : null}

            {project.challenge?.trim() ? (
              <Reveal>
                <h2 className="font-display text-2xl text-white">Challenge</h2>
                <p className="mt-3 whitespace-pre-wrap text-white/75 leading-relaxed">
                  {project.challenge}
                </p>
              </Reveal>
            ) : null}
            {project.outcome?.trim() ? (
              <Reveal>
                <h2 className="font-display text-2xl text-white">Outcome</h2>
                <p className="mt-3 whitespace-pre-wrap text-white/75 leading-relaxed">
                  {project.outcome}
                </p>
              </Reveal>
            ) : null}

            {showProductBand ? (
              <Reveal>
                <div className="rounded-xl border border-white/15 bg-white/[0.03] px-5 py-6">
                  <p className="text-[0.65rem] uppercase tracking-[0.2em] text-white/45">
                    Product case study
                  </p>
                  <h2 className="mt-2 font-display text-2xl text-white">
                    Full visual narrative on Mirotech
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-white/65">
                    The screen-by-screen product story lives on Mirotech Work. This Brightline page
                    is the photography / collaboration companion — not a mirror of every section.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <a
                      href={mirotechWorkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-lg border border-white/25 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.16em] text-white/85 no-underline hover:border-white/45 hover:text-white"
                    >
                      View on Mirotech →
                    </a>
                  </div>
                </div>
              </Reveal>
            ) : null}

            {project.tools?.length || project.categories?.length ? (
              <Reveal>
                <h2 className="font-display text-2xl text-white">Details</h2>
                <dl className="mt-4 grid gap-3 text-sm text-white/70 sm:grid-cols-2">
                  {project.categories?.length ? (
                    <div>
                      <dt className="text-[0.65rem] uppercase tracking-[0.18em] text-white/45">
                        Categories
                      </dt>
                      <dd className="mt-1">{project.categories.join(", ")}</dd>
                    </div>
                  ) : null}
                  {project.tools?.length ? (
                    <div>
                      <dt className="text-[0.65rem] uppercase tracking-[0.18em] text-white/45">
                        Tools
                      </dt>
                      <dd className="mt-1">{project.tools.join(", ")}</dd>
                    </div>
                  ) : null}
                </dl>
              </Reveal>
            ) : null}

            {!hasNarrative && !hasDesign ? (
              <Reveal>
                <p className="text-white/60">
                  Photo narrative for this collaboration is forthcoming. Add overview, approach, and
                  notes in Studio CMS to fill this page.
                </p>
              </Reveal>
            ) : null}

          </div>
        </div>
      </div>
    </article>
  );
}
