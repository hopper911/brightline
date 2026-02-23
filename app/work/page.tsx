import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Reveal from "@/components/Reveal";
import { SECTIONS } from "@/lib/config/sections";
import { getFeaturedHeroForSection } from "@/lib/queries/work";
import { slugToSection } from "@/lib/config/sections";
import { getPublicR2Url } from "@/lib/r2";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Work · Bright Line Photography",
  description:
    "Commercial photography across advertising, real estate, culture, business, and travel. Case studies and project showcases.",
  alternates: { canonical: "/work" },
  openGraph: {
    title: "Work · Bright Line Photography",
    description:
      "Commercial photography across advertising, real estate, culture, business, and travel.",
    url: "/work",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "Bright Line Photography" }],
  },
};

export default async function WorkIndexPage() {
  const sectionData = await Promise.all(
    SECTIONS.map(async (s) => {
      const hero = await getFeaturedHeroForSection(slugToSection(s.slug));
      let coverUrl: string | null = null;
      let coverAlt: string | null = null;
      if (hero?.kind === "IMAGE" && hero.keyFull) {
        coverUrl = getPublicR2Url(hero.keyFull);
        coverAlt = hero.alt ?? s.title;
      }
      return { ...s, coverUrl, coverAlt };
    })
  );

  return (
    <div className="section-pad mx-auto max-w-6xl px-6 lg:px-10">
      <Reveal>
        <p className="section-kicker">Work</p>
        <h1 className="section-title">Case studies</h1>
        <p className="section-subtitle">
          Advertising, real estate, culture, business, and travel projects.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sectionData.map((section) => (
          <Reveal key={section.slug}>
            <Link
              href={`/work/${section.slug}`}
              className="group block overflow-hidden rounded-2xl border border-white/10 bg-black/40 lift-card"
            >
              <div className="relative h-[200px] w-full">
                {section.coverUrl ? (
                  <Image
                    src={section.coverUrl}
                    alt={section.coverAlt ?? section.title}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover image-zoom"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-black/60 text-white/40">
                    <span className="text-xs uppercase tracking-[0.2em]">
                      {section.title}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                  {section.title}
                </p>
                <p className="mt-2 text-sm text-white/80 group-hover:text-white">
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
