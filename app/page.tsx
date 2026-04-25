import Link from "next/link";
import HomeHero from "@/components/HomeHero";
import Reveal from "@/components/Reveal";
import WorkCard from "@/components/WorkCard";
import Testimonials from "@/components/testimonials/Testimonials";
import WebsitePageView from "@/components/WebsitePageView";
import { BRAND, getUrl } from "@/lib/config/brand";
import {
  AI_SECTION,
  FOUR_BEATS,
  HOMEPAGE_WORK_HEADLINE,
  HOMEPAGE_WORK_SUB,
  POSITIONING_STRIP,
  STRUCTURED_DELIVERY,
} from "@/lib/config/strategicPositioning";
import { PILLARS } from "@/lib/portfolioPillars";
import { getFeaturedHeroForSection } from "@/lib/queries/work";
import { getHomepageFeaturedMedia } from "@/lib/queries/site";
import { getPublishedGalleryCards } from "@/lib/queries/public-galleries";
import { getPublicR2Url } from "@/lib/r2";
import { getPublishedWebsitePageBySlug } from "@/lib/website-pages";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Commercial Photography | ${BRAND.name}`,
  description:
    "Premium photography with structured delivery—visuals designed to perform across web, search, and social. Architecture, advertising, and corporate.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `Commercial Photography | ${BRAND.name}`,
    description:
      "Premium photography with structured delivery—visuals designed to perform across web, search, and social.",
    url: "/",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: BRAND.name,
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Commercial Photography | ${BRAND.name}`,
    description:
      "Premium photography with structured delivery—visuals designed to perform across web, search, and social.",
    images: ["/og-image.svg"],
  },
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": ["ProfessionalService", "LocalBusiness"],
  name: BRAND.name,
  url: BRAND.url,
  image: getUrl(BRAND.metadata.ogImage),
  areaServed: [
    "New York City, NY",
    "Brooklyn, NY",
    "Jersey City, NJ",
    "Hoboken, NJ",
    "Northern New Jersey",
    "Tri-State Area",
  ],
  address: {
    "@type": "PostalAddress",
    addressLocality: "Jersey City",
    addressRegion: "NJ",
    addressCountry: "US",
  },
  sameAs: Object.values(BRAND.social).filter(Boolean),
  serviceType: [
    "Commercial Photography",
    "Architecture Photography",
    "Advertising Photography",
    "Corporate Photography",
    "Visual Content Strategy",
  ],
};

export default async function Page() {
  const pageOverride = await getPublishedWebsitePageBySlug("home");
  if (pageOverride) {
    return <WebsitePageView page={pageOverride} />;
  }

  let pillarData: {
    slug: string;
    label: string;
    homeMeta: string;
    coverUrl: string;
    coverAlt: string;
  }[];
  try {
    pillarData = await Promise.all(
      PILLARS.map(async (pillar) => {
        const firstSection = pillar.sections[0];
        const hero = firstSection
          ? await getFeaturedHeroForSection(firstSection)
          : null;
        let coverUrl = "";
        const imageKey = hero?.kind === "IMAGE" ? hero.keyFull ?? hero.keyThumb : null;
        if (imageKey) {
          coverUrl = getPublicR2Url(imageKey);
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

  let featuredImage: { url: string; alt: string } | null = null;
  try {
    const media = await getHomepageFeaturedMedia();
    if (media) {
      featuredImage = {
        url: getPublicR2Url(media.displayKey),
        alt: media.alt ?? "Featured work",
      };
    }
  } catch {
    featuredImage = null;
  }

  let galleryCards: Awaited<ReturnType<typeof getPublishedGalleryCards>> = [];
  try {
    galleryCards = await getPublishedGalleryCards(3);
  } catch {
    galleryCards = [];
  }

  return (
    <div className="page-shell min-h-screen">
      <div className="soft-grid">
        <script type="application/ld+json">
          {JSON.stringify(localBusinessSchema)}
        </script>
        <HomeHero featuredImage={featuredImage} />

        <Reveal className="section-pad relative mx-auto max-w-3xl px-6 text-center lg:px-10">
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-white/60">
            {POSITIONING_STRIP.kicker}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/85 md:text-base">
            {POSITIONING_STRIP.body}
          </p>
        </Reveal>

        {galleryCards.length > 0 ? (
          <Reveal
            id="galleries"
            className="section-pad relative mx-auto max-w-6xl px-6 lg:px-10 scroll-mt-20"
          >
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="space-y-2">
                <p className="text-[0.65rem] uppercase tracking-[0.35em] text-white/60">
                  Galleries
                </p>
                <h2 className="font-display text-2xl md:text-3xl text-white text-balance">
                  Published image sets from recent deliveries.
                </h2>
                <p className="max-w-xl text-sm text-white/75">
                  A quick look at selected galleries across proofing, selections, and final delivery.
                </p>
              </div>
              <Link href="/galleries" className="btn btn-ghost">
                View galleries
              </Link>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {galleryCards.map((gallery, index) => (
                <Reveal key={gallery.id} delay={index * 0.08}>
                  <Link
                    href={`/galleries/${gallery.slug}`}
                    className="group block overflow-hidden rounded-2xl border border-white/10 bg-black/40 lift-card"
                  >
                    <div className="relative h-[260px] overflow-hidden bg-black/60">
                      {gallery.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={gallery.coverUrl}
                          alt={gallery.title}
                          className="h-full w-full object-cover image-zoom"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-6 text-center text-xs uppercase tracking-[0.24em] text-white/40">
                          {gallery.title}
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <p className="text-[0.62rem] uppercase tracking-[0.28em] text-white/45">
                        {gallery.galleryType?.replace(/_/g, " ").toLowerCase() ?? "gallery"}
                      </p>
                      <h3 className="mt-2 font-display text-lg text-white group-hover:underline">
                        {gallery.title}
                      </h3>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </Reveal>
        ) : null}

        <Reveal className="section-pad relative mx-auto max-w-6xl px-6 lg:px-10">
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-white/60">
            Approach
          </p>
          <h2 className="mt-2 font-display text-2xl text-white md:text-3xl">
            Beyond the shoot
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FOUR_BEATS.map((beat, index) => (
              <Reveal key={beat.title} delay={index * 0.05}>
                <div className="h-full rounded-2xl border border-white/10 bg-white/80 p-5 shadow-sm">
                  <h3 className="font-display text-lg text-black">{beat.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-black/80">{beat.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>

        <Reveal className="section-pad relative mx-auto max-w-6xl px-6 lg:px-10">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.06] p-6 md:p-10">
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-white/60">
              {STRUCTURED_DELIVERY.headline}
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/85 md:text-base">
              {STRUCTURED_DELIVERY.intro}
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {STRUCTURED_DELIVERY.bullets.map((line) => (
                <li key={line} className="flex gap-2 text-sm text-white/80">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/45" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal className="section-pad relative mx-auto max-w-6xl px-6 lg:px-10">
          <div className="rounded-[24px] border border-white/10 p-6 md:p-8">
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-white/60">
              {AI_SECTION.headline}
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/80 md:text-base">
              {AI_SECTION.body}
            </p>
          </div>
        </Reveal>

        <Reveal
          id="work"
          className="section-pad relative mx-auto max-w-6xl px-6 lg:px-10 scroll-mt-20"
        >
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="space-y-2">
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-white/60">
                Work
              </p>
              <h2 className="font-display text-2xl md:text-3xl text-white text-balance">
                {HOMEPAGE_WORK_HEADLINE}
              </h2>
              <p className="max-w-xl text-sm text-white/75">{HOMEPAGE_WORK_SUB}</p>
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
                  title={pillar.label}
                  meta={pillar.homeMeta}
                />
              </Reveal>
            ))}
          </div>
        </Reveal>

        <Reveal className="section-pad relative mx-auto max-w-6xl px-6 lg:px-10">
          <p className="text-[0.65rem] uppercase tracking-[0.35em] text-white/60">
            Kind words
          </p>
          <div className="mt-6">
            <Testimonials />
          </div>
          <div className="mt-10">
            <Link href="/services" className="btn btn-primary">
              Services
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
