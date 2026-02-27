import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Reveal from "@/components/Reveal";
import { PILLARS } from "@/lib/portfolioPillars";
import { getFeaturedHeroForSection } from "@/lib/queries/work";
import { getGridImageUrl } from "@/lib/r2";

export const dynamic = "force-dynamic";

async function fetchPillarData() {
  return Promise.all(
    PILLARS.map(async (pillar) => {
      const firstSection = pillar.sections[0];
      const hero = firstSection
        ? await getFeaturedHeroForSection(firstSection)
        : null;
      let coverUrl: string | null = null;
      let coverAlt: string | null = null;
      if (hero?.kind === "IMAGE") {
        coverUrl = getGridImageUrl(hero.keyFull, hero.keyThumb) || null;
        coverAlt = hero.alt ?? pillar.label;
      }
      return { ...pillar, coverUrl, coverAlt };
    })
  );
}

export const metadata: Metadata = {
  title: "Work · Bright Line Photography",
  description:
    "Campaign & advertising, architecture & spaces, and corporate photography. Case studies and project showcases.",
  alternates: { canonical: "/work" },
  openGraph: {
    title: "Work · Bright Line Photography",
    description:
      "Campaign & advertising, architecture & spaces, and corporate photography.",
    url: "/work",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "Bright Line Photography" }],
  },
};

export default async function WorkIndexPage() {
  let pillarData: Awaited<ReturnType<typeof fetchPillarData>>;
  try {
    pillarData = await fetchPillarData();
  } catch {
    pillarData = PILLARS.map((p) => ({
      ...p,
      coverUrl: null as string | null,
      coverAlt: null as string | null,
    }));
  }

  return (
    <div className="section-pad mx-auto max-w-6xl px-6 lg:px-10">
      <Reveal>
        <p className="section-kicker">Work</p>
        <h1 className="section-title">Case studies</h1>
        <p className="section-subtitle">
          Campaign, architecture, and corporate photography.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {pillarData.map((pillar) => (
          <Reveal key={pillar.slug}>
            <Link
              href={`/work/${pillar.slug}`}
              className="group block overflow-hidden rounded-xl border border-white/10 bg-black/40 lift-card"
            >
              <div className="relative h-[200px] w-full">
                {pillar.coverUrl ? (
                  <Image
                    src={pillar.coverUrl}
                    alt={pillar.coverAlt ?? pillar.label}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover image-zoom"
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
                <p className="mt-2 text-xs text-white/80 group-hover:text-white">
                  View projects →
                </p>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
