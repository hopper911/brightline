import Link from "next/link";
import HomeHero from "@/components/HomeHero";
import Reveal from "@/components/Reveal";
import WorkCard from "@/components/WorkCard";
import PrimaryCTA from "@/components/PrimaryCTA";
import ClientLogos from "@/components/clients/ClientLogos";
import Testimonials from "@/components/testimonials/Testimonials";
import { BRAND, getUrl } from "@/lib/config/brand";
import { PILLARS } from "@/lib/portfolioPillars";
import { getFeaturedHeroForSection } from "@/lib/queries/work";
import { getPublicR2Url } from "@/lib/r2";

export const metadata = {
  title: "Commercial Photography | Bright Line Photography",
  description:
    "Editorial photography for brands that want quiet luxury and commercial clarity. Campaign, hospitality, and corporate imagery.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Commercial Photography | Bright Line Photography",
    description:
      "Editorial photography for brands that want quiet luxury and commercial clarity.",
    url: "/",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Bright Line Photography",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Commercial Photography | Bright Line Photography",
    description:
      "Editorial photography for brands that want quiet luxury and commercial clarity.",
    images: ["/og-image.svg"],
  },
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": ["ProfessionalService", "LocalBusiness"],
  name: BRAND.name,
  url: BRAND.url,
  image: getUrl(BRAND.metadata.ogImage),
  areaServed: "United States",
  address: {
    "@type": "PostalAddress",
    addressLocality: "New York",
    addressRegion: "NY",
    addressCountry: "US",
  },
  sameAs: Object.values(BRAND.social).filter(Boolean),
  serviceType: [
    "Commercial Photography",
    "Hospitality Photography",
    "Real Estate Photography",
    "Fashion Photography",
  ],
};

export default async function Page() {
  let pillarData: { slug: string; label: string; coverUrl: string; coverAlt: string }[];
  try {
    pillarData = await Promise.all(
      PILLARS.map(async (pillar) => {
        const firstSection = pillar.sections[0];
        const hero = firstSection
          ? await getFeaturedHeroForSection(firstSection)
          : null;
        let coverUrl = "";
        if (hero?.kind === "IMAGE" && hero.keyFull) {
          coverUrl = getPublicR2Url(hero.keyFull);
        } else {
          coverUrl = "/images/hero.jpg";
        }
        return {
          ...pillar,
          coverUrl,
          coverAlt: hero?.alt ?? pillar.label,
        };
      })
    );
  } catch {
    pillarData = PILLARS.map((p) => ({
      ...p,
      coverUrl: "/images/hero.jpg",
      coverAlt: p.label,
    }));
  }

  return (
    <div className="page-shell min-h-screen">
      <div className="soft-grid">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(localBusinessSchema),
          }}
        />
        <HomeHero />

        <Reveal
          id="work"
          className="section-pad relative mx-auto max-w-6xl px-6 lg:px-10 scroll-mt-20"
        >
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="space-y-2">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-black/50">
                Work
              </p>
              <h2 className="font-display text-2xl md:text-3xl text-black text-balance">
                Campaign, hospitality, and corporate.
              </h2>
            </div>
            <Link href="/work" className="btn btn-ghost">
              See all work
            </Link>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {pillarData.map((pillar, index) => (
              <Reveal key={pillar.slug} delay={index * 0.08}>
                <WorkCard
                  href={`/work/${pillar.slug}`}
                  cover={pillar.coverUrl}
                  alt={pillar.coverAlt ?? pillar.label}
                  tag={pillar.label}
                  title={pillar.label}
                  meta="View projects"
                />
              </Reveal>
            ))}
          </div>
        </Reveal>

        <Reveal className="section-pad relative mx-auto max-w-6xl px-6 lg:px-10">
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-black/50">
            Clients
          </p>
          <div className="mt-4 py-6">
            <ClientLogos />
          </div>
          <p className="mt-12 text-[0.65rem] uppercase tracking-[0.35em] text-black/50">
            Kind words
          </p>
          <div className="mt-6">
            <Testimonials />
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-6">
            <PrimaryCTA service="general" />
            <Link href="/services" className="text-xs uppercase tracking-[0.3em] text-black/60 link-underline">
              Services
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
