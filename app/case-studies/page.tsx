import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Reveal from "@/components/Reveal";
import { CASE_STUDIES } from "@/lib/caseStudies";
import { getPublicR2Url } from "@/lib/r2";

export const metadata: Metadata = {
  title: "Case Studies · Bright Line Photography",
  description:
    "Selected case studies: campaign, hospitality, and corporate photography projects.",
  alternates: { canonical: "/case-studies" },
  openGraph: {
    title: "Case Studies · Bright Line Photography",
    url: "/case-studies",
  },
};

function imageUrl(key: string): string {
  if (key.startsWith("/")) return key;
  return getPublicR2Url(key);
}

export default function CaseStudiesPage() {
  return (
    <div className="section-pad mx-auto max-w-6xl px-6 lg:px-10">
      <Reveal>
        <p className="section-kicker">Case studies</p>
        <h1 className="section-title">Selected work</h1>
        <p className="section-subtitle">
          The challenge, approach, and result for a few recent projects.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {CASE_STUDIES.map((study, index) => (
          <Reveal key={study.slug} delay={index * 0.08}>
            <Link
              href={`/case-studies/${study.slug}`}
              className="group block overflow-hidden rounded-xl border border-white/10 bg-black/40 lift-card"
            >
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src={imageUrl(study.heroKey ?? study.imageKeys[0] ?? "")}
                  alt={study.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover image-zoom"
                />
              </div>
              <div className="p-5">
                <p className="text-[0.65rem] uppercase tracking-[0.3em] text-white/50">
                  {study.client} · {study.industry}
                </p>
                <h2 className="mt-2 text-base text-white group-hover:text-white">
                  {study.title}
                </h2>
                <p className="mt-2 text-xs text-white/70">View case study →</p>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
