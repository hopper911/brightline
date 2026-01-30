import Image from "next/image";
import Link from "next/link";
import HomeHero from "@/components/HomeHero";
import Reveal from "@/components/Reveal";
import PortfolioCard from "@/components/PortfolioCard";
import PrimaryCTA from "@/components/PrimaryCTA";

export const metadata = {
  title: "Commercial Photography | Bright Line Photography",
  description:
    "Commercial real estate, hospitality, and fashion photography in NYC and beyond.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Commercial Photography | Bright Line Photography",
    description:
      "Commercial real estate, hospitality, and fashion photography in NYC and beyond.",
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
      "Commercial real estate, hospitality, and fashion photography in NYC and beyond.",
    images: ["/og-image.svg"],
  },
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": ["ProfessionalService", "LocalBusiness"],
  name: "Bright Line Photography",
  url: "https://brightlinephotography.co",
  image: "https://brightlinephotography.co/og-image.svg",
  areaServed: "United States",
  address: {
    "@type": "PostalAddress",
    addressLocality: "New York",
    addressRegion: "NY",
    addressCountry: "US",
  },
  sameAs: [],
  serviceType: [
    "Commercial Photography",
    "Hospitality Photography",
    "Real Estate Photography",
    "Fashion Photography",
  ],
};

const BLUR_DATA =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iNyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iI2U4ZTllYSIvPjwvc3ZnPg==";

const featured = [
  {
    title: "Architecture & Interiors",
    tag: "Commercial",
    href: "/portfolio/commercial-real-estate/real-estate-01",
    image: "/images/real-estate.jpg",
  },
  {
    title: "Hospitality & Travel",
    tag: "Lifestyle",
    href: "/portfolio/hospitality/hotel-01",
    image: "/images/hospitality.jpg",
  },
  {
    title: "Editorial Fashion",
    tag: "Campaign",
    href: "/portfolio/fashion/fashion-01",
    image: "/images/fashion.jpg",
  },
  {
    title: "Culinary Stories",
    tag: "Food",
    href: "/portfolio/culinary/food-01",
    image: "/images/food.jpg",
  },
];

const services = [
  {
    title: "Brand Identity Shoots",
    copy: "Full-bleed storyboarding, art direction, and images crafted for consistent brand voice.",
  },
  {
    title: "Location & Property",
    copy: "Luxury interiors, hospitality, and real estate imagery with cinematic daylight focus.",
  },
  {
    title: "Editorial & Campaign",
    copy: "Collaborative sets, on-location styling, and images designed to travel across platforms.",
  },
  {
    title: "Content Libraries",
    copy: "Quarterly photo banks that stay on-message for web, social, and print.",
  },
];

const testimonials = [
  {
    quote:
      "Bright Line understands how to make a space feel alive. We booked out our new suites within two weeks.",
    name: "Elena Marquis",
    role: "Director, Maison Delmar",
  },
  {
    quote:
      "They came with a visual narrative, not just a shot list. The campaign felt elevated from day one.",
    name: "Noah Kim",
    role: "Creative Lead, Meridian Studio",
  },
];

const whatYouGet = [
  {
    title: "Deliverables",
    items: [
      "Hero imagery + supporting selects",
      "Crops for web, social, and print",
      "Consistent color + tonal grading",
    ],
  },
  {
    title: "Turnaround",
    items: [
      "Proofs in 5–7 days",
      "Finals in 10–14 days",
      "Rush options on request",
    ],
  },
  {
    title: "Usage options",
    items: [
      "Web + social usage included",
      "Paid media extensions available",
      "Print-ready exports",
    ],
  },
];

const howItWorks = [
  { step: "Inquiry", detail: "Share your goals, timeline, and locations." },
  { step: "Shoot", detail: "On-site art direction with a calm, precise crew." },
  { step: "Selects", detail: "Proof gallery with recommendations and edits." },
  { step: "Delivery", detail: "Final library optimized for every channel." },
];

export default function Page() {
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

        <Reveal id="portfolio" className="relative mx-auto max-w-6xl px-4 pb-20 pt-12 scroll-mt-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.35em] text-black/50">
                Featured Work
              </p>
              <h2 className="font-display text-3xl md:text-4xl text-black">
                Galleries curated for design-forward brands.
              </h2>
            </div>
            <Link
              href="/work"
              className="btn btn-ghost"
            >
              See all work
            </Link>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {featured.map((item, index) => (
              <Reveal key={item.title} delay={index * 0.08}>
                <PortfolioCard
                  href={item.href}
                  cover={item.image}
                  alt={item.title}
                  tag={item.tag}
                  title={item.title}
                  meta="View project"
                />
              </Reveal>
            ))}
          </div>
        </Reveal>

        <Reveal className="relative mx-auto max-w-6xl px-4 pb-20">
          <Link
            href="/about"
            className="lift-card group block"
            aria-label="Learn about the Bright Line approach"
          >
            <div className="grid gap-10 rounded-[32px] border border-black/10 bg-white/70 p-8 shadow-[0_24px_60px_rgba(27,26,23,0.12)] transition group-hover:border-black/20 md:grid-cols-[1.1fr_0.9fr] md:p-12">
              <div className="space-y-5">
                <p className="text-xs uppercase tracking-[0.35em] text-black/50">
                  The Approach
                </p>
                <h2 className="font-display text-3xl md:text-4xl text-black">
                  A calm, precise process from concept to final delivery.
                </h2>
                <p className="text-base text-black/70">
                  From location scouting and lighting design to post-production
                  color stories, we build image systems that feel cinematic and
                  cohesive across every touchpoint.
                </p>
                <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.3em] text-black/60">
                  <span className="rounded-full border border-black/20 px-4 py-2">
                    Art Direction
                  </span>
                  <span className="rounded-full border border-black/20 px-4 py-2">
                    Styling
                  </span>
                  <span className="rounded-full border border-black/20 px-4 py-2">
                    Retouching
                  </span>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-[24px]">
                <Image
                  src="/images/design.jpg"
                  alt="Studio moodboard"
                  width={560}
                  height={520}
                  sizes="(min-width: 1024px) 520px, 100vw"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA}
                  className="h-full w-full object-cover image-fade"
                />
              </div>
            </div>
        </Link>
        </Reveal>

        <Reveal className="relative mx-auto max-w-6xl px-4 pb-20">
          <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-start">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.35em] text-black/50">
                What you get
              </p>
              <h2 className="font-display text-3xl md:text-4xl text-black">
                A premium image system built for conversion.
              </h2>
              <p className="text-base text-black/70">
                Every engagement delivers a strategic library: hero imagery,
                supporting sets, and crops designed for web, social, and print.
              </p>
            </div>
            <div className="grid gap-4">
              {whatYouGet.map((block) => (
                <div
                  key={block.title}
                  className="rounded-2xl border border-black/10 bg-white/70 p-6"
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-black/50">
                    {block.title}
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-black/70">
                    {block.items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-white/60" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal className="relative mx-auto max-w-6xl px-4 pb-20">
          <div className="rounded-[28px] border border-black/10 bg-white/70 p-6 md:p-10">
            <p className="text-xs uppercase tracking-[0.35em] text-black/50">
              How it works
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              {howItWorks.map((item, index) => (
                <div key={item.step} className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-black/50">
                    {String(index + 1).padStart(2, "0")} · {item.step}
                  </p>
                  <p className="text-sm text-black/70">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal className="relative mx-auto max-w-6xl px-4 pb-20">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.35em] text-black/50">
                Services
              </p>
              <h2 className="font-display text-3xl md:text-4xl text-black">
                High-touch visual production for teams that value taste.
              </h2>
            </div>
            <p className="text-base text-black/70">
              We partner with founders, marketing leads, and interior teams to
              craft imagery with strong ROI. Every session delivers a library of
              content mapped to your channels.
            </p>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {services.map((service) => (
              <Link
                key={service.title}
                href="/services"
                className="lift-card group rounded-[28px] border border-black/10 bg-white/70 p-6 shadow-[0_20px_50px_rgba(27,26,23,0.1)]"
                aria-label={`View services for ${service.title}`}
              >
                <h3 className="font-display text-xl text-black">
                  {service.title}
                </h3>
                <p className="mt-3 text-sm text-black/70">{service.copy}</p>
                <span className="mt-4 inline-flex items-center text-xs uppercase tracking-[0.3em] text-black/60 link-underline">
                  Learn more
                </span>
              </Link>
            ))}
          </div>
        </Reveal>

        <Reveal className="relative mx-auto max-w-6xl px-4 pb-20">
          <div className="grid gap-6 md:grid-cols-2">
            {testimonials.map((item, index) => (
              <div
                key={item.name}
                className="lift-card rounded-[28px] border border-black/10 bg-white/80 p-6"
              >
                <p className="font-display text-2xl text-black">
                  “{item.quote}”
                </p>
                <p className="mt-4 text-xs uppercase tracking-[0.3em] text-black/60">
                  {item.name} · {item.role}
                </p>
                {index === 0 && (
                  <div className="mt-6 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-black/50">
                    <span>5/5 Client Satisfaction</span>
                    <span>28 Brands Served</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-8">
            <PrimaryCTA service="general" />
          </div>
        </Reveal>

        <Reveal className="relative mx-auto max-w-6xl px-4 pb-24">
          <div className="rounded-[36px] border border-black/10 bg-black px-8 py-12 text-white md:px-12">
            <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-center">
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.35em] text-white/60">
                  Let&apos;s collaborate
                </p>
                <h2 className="font-display text-3xl md:text-4xl text-white">
                  If the work resonates, let&apos;s talk.
                </h2>
                <p className="text-sm text-white/70">
                  Schedule a discovery call or request the full pricing
                  overview.
                </p>
              </div>
              <div className="flex flex-wrap gap-4 md:justify-end">
                <PrimaryCTA service="general" className="btn btn-light" />
                <Link
                  href="/services"
                  className="btn btn-outline-light"
                >
                  View Services
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
