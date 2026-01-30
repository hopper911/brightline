export const metadata = {
  title: "About | Bright Line Photography",
  description:
    "A commercial photography studio specializing in hospitality, real estate, and editorial work.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About | Bright Line Photography",
    description:
      "A commercial photography studio specializing in hospitality, real estate, and editorial work.",
    url: "/about",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Bright Line Photography",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About | Bright Line Photography",
    description:
      "A commercial photography studio specializing in hospitality, real estate, and editorial work.",
    images: ["/og-image.svg"],
  },
};

import Link from "next/link";
import Reveal from "@/components/Reveal";
import PrimaryCTA from "@/components/PrimaryCTA";

const values = [
  "Art direction & concept",
  "On-location production",
  "Color & post-production",
  "Multi-channel delivery",
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <Reveal>
        <p className="text-xs uppercase tracking-[0.35em] text-black/50">
          About Bright Line
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-black mt-2">
          Crafted for modern brands.
        </h1>
        <p className="mt-6 text-base md:text-lg text-black/70 max-w-2xl">
          Bright Line is a commercial photography studio delivering imagery for
          hospitality, real estate, retail, and fashion teams that demand clarity
          and quiet luxury. We collaborate on creative direction, shot lists, and
          post-production to keep every channel cohesive.
        </p>
      </Reveal>

      <Reveal className="mt-16" delay={0.08}>
        <h2 className="font-display text-2xl md:text-3xl text-black">
          A focused, efficient workflow.
        </h2>
        <p className="mt-4 text-base text-black/70 max-w-2xl">
          From pre-production to final delivery, we optimize each shoot for
          timeline, budget, and usage needs. Our team works across New York, Miami,
          and destination locations to build visual systems that last.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {values.map((v) => (
            <span
              key={v}
              className="rounded-full border border-black/20 px-4 py-2 text-xs uppercase tracking-[0.28em] text-black/60"
            >
              {v}
            </span>
          ))}
        </div>
      </Reveal>

      <Reveal className="mt-20" delay={0.12}>
        <div className="rounded-[28px] border border-black/10 bg-black px-8 py-12 text-white md:px-12">
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">
            Let&apos;s work together
          </p>
          <h2 className="font-display text-2xl md:text-3xl text-white mt-2">
            Ready to build your next visual story?
          </h2>
          <p className="mt-4 text-sm text-white/70 max-w-xl">
            Share your project, timeline, and goals. We respond with a tailored scope within 24 hours.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <PrimaryCTA service="general" className="btn btn-light" />
            <Link href="/portfolio" className="btn btn-outline-light">
              View portfolio
            </Link>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
