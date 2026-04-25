import Link from "next/link";
import Reveal from "@/components/Reveal";
import PrimaryCTA from "@/components/PrimaryCTA";
import CredibilityBar from "@/components/CredibilityBar";
import ProcessTimeline from "@/components/ProcessTimeline";
import BookingButton from "@/components/BookingButton";
import WebsitePageView from "@/components/WebsitePageView";
import { BRAND } from "@/lib/config/brand";
import { getPublishedWebsitePageBySlug } from "@/lib/website-pages";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `About | ${BRAND.name}`,
  description:
    "Premium visual studio: photography with structured delivery and intelligent systems. Local to New Jersey and the New York metro—NYC, Brooklyn, Jersey City, Hoboken, and the Tri-State area.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: `About | ${BRAND.name}`,
    description:
      "Premium visual studio: photography with structured delivery and intelligent systems.",
    url: "/about",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: BRAND.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `About | ${BRAND.name}`,
    description:
      "Premium visual studio: photography with structured delivery and intelligent systems.",
    images: ["/og-image.svg"],
  },
};

const capabilities = [
  "Art direction & concept",
  "On-location production",
  "Color & post-production",
  "Structured delivery & metadata",
  "AI-assisted content systems",
  "Search, social & web asset preparation",
];

const industries = [
  {
    name: "Hospitality",
    description: "Hotels, resorts, wellness, and travel brands",
  },
  {
    name: "Commercial Real Estate",
    description: "Office, mixed-use, luxury residential, and amenity spaces",
  },
  {
    name: "Fashion & Editorial",
    description: "Campaigns, lookbooks, and ecommerce",
  },
  {
    name: "Culinary & Lifestyle",
    description: "F&B, retail, and brand storytelling",
  },
  {
    name: "AI-Ready Brand Systems",
    description: "Visual libraries, metadata, captions, and structured assets for modern content workflows",
  },
];

const differentiators = [
  {
    title: "Production-first approach",
    description:
      "Every shoot starts with a clear shot list, location plan, and timeline. No wasted time on set.",
  },
  {
    title: "Usage-aware pricing",
    description:
      "We quote based on scope and licensing needs—so you only pay for what you'll actually use.",
  },
  {
    title: "Fast, consistent delivery",
    description:
      "Proofs in 5-7 days, finals in 10-14 days. Rush timelines when launch dates demand it.",
  },
  {
    title: "Long-term partnerships",
    description:
      "Many clients return for seasonal refreshes and new chapters. A refined internal workflow scales with you.",
  },
];

export default async function AboutPage() {
  const pageOverride = await getPublishedWebsitePageBySlug("about");
  if (pageOverride) {
    return <WebsitePageView page={pageOverride} />;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 lg:px-10 section-pad py-16">
      {/* Hero Section */}
      <Reveal>
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">
          About BRIGHTLINE
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-white mt-2 max-w-3xl">
          A studio built for brands that care how visuals perform.
        </h1>
        <p className="mt-6 text-base md:text-lg text-white/80 max-w-2xl">
          BRIGHTLINE is a premium visual studio: photography plus structured delivery—organized assets,
          SEO-aware preparation, and practical guidance for web, search, and social. We think like
          strategists, not only photographers, with a systemized workflow behind every handoff.
        </p>
      </Reveal>

      {/* Credibility Stats */}
      <Reveal className="mt-12" delay={0.04}>
        <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6 md:p-8">
          <CredibilityBar variant="dark" showDescription />
        </div>
      </Reveal>

      {/* Founder */}
      <Reveal className="mt-20" delay={0.06}>
        <div className="grid gap-8 md:grid-cols-[0.4fr_1fr] md:items-start">
          <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4 text-center">
            <div className="mx-auto h-24 w-24 rounded-full bg-white/10" />
            <p className="mt-4 font-medium text-white">Studio Principal</p>
            <p className="text-sm text-white/70">New Jersey / New York metro</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">
              The Studio
            </p>
            <h2 className="font-display text-2xl md:text-3xl text-white mt-2">
              Built by practitioners, not just photographers.
            </h2>
            <p className="mt-4 text-base text-white/80">
              BRIGHTLINE started from a simple frustration: too many shoots deliver beautiful files
              that are hard to use—unclear naming, missing metadata, no guidance for where assets should
              live. We built a studio around production discipline and structured handoffs: shot lists,
              efficient capture, and delivery your team can activate without guesswork.
            </p>
            <p className="mt-4 text-base text-white/80">
              Every project gets the same care: pre-production that prevents surprises, direction on set
              that matches usage goals, and post-production that lands as consistent, channel-ready work.
            </p>
          </div>
        </div>
      </Reveal>

      {/* What Clients Get */}
      <Reveal className="mt-20" delay={0.07}>
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">
          Outcomes
        </p>
        <h2 className="font-display text-2xl md:text-3xl text-white mt-2">
          What clients get
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-[16px] border border-black/10 bg-white p-5">
            <p className="font-medium text-black">Brand-ready imagery</p>
            <p className="mt-2 text-sm text-black/70">
              Every deliverable is color-corrected, retouched, and optimized for
              your brand guidelines—no additional editing needed.
            </p>
          </div>
          <div className="rounded-[16px] border border-black/10 bg-white p-5">
            <p className="font-medium text-black">Consistent visual system</p>
            <p className="mt-2 text-sm text-black/70">
              From hero shots to detail crops, your assets feel cohesive across
              web, social, and print applications.
            </p>
          </div>
          <div className="rounded-[16px] border border-black/10 bg-white p-5">
            <p className="font-medium text-black">Decision-maker visuals</p>
            <p className="mt-2 text-sm text-black/70">
              Imagery designed to convert—whether you&apos;re selling rooms,
              leasing space, or launching a campaign.
            </p>
          </div>
        </div>
      </Reveal>

      {/* Industries */}
      <Reveal className="mt-20" delay={0.08}>
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">
          Industries
        </p>
        <h2 className="font-display text-2xl md:text-3xl text-white mt-2">
          Who we work with
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {industries.map((industry) => (
            <div
              key={industry.name}
              className="rounded-[16px] border border-black/10 bg-white p-5"
            >
              <h3 className="font-medium text-black">{industry.name}</h3>
              <p className="mt-1 text-sm text-black/70">{industry.description}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Capabilities */}
      <Reveal className="mt-20" delay={0.08}>
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">
          Capabilities
        </p>
        <h2 className="font-display text-2xl md:text-3xl text-white mt-2">
          End-to-end production
        </h2>
        <p className="mt-4 text-base text-white/80 max-w-2xl">
          From pre-production to final delivery, we handle every stage of the
          shoot. We are a local studio serving NYC, Brooklyn, Jersey City,
          Hoboken, and the broader Tri-State area—focused on New Jersey and New
          York metro projects. We also help clients turn finished visuals into
          usable content systems: metadata, captions, web-ready selects, social
          assets, and AI-assisted organization for faster publishing.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {capabilities.map((v) => (
            <span
              key={v}
              className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/75"
            >
              {v}
            </span>
          ))}
        </div>
      </Reveal>

      {/* Process */}
      <Reveal className="mt-20" delay={0.1}>
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">
          Process
        </p>
        <h2 className="font-display text-2xl md:text-3xl text-white mt-2">
          How we work
        </h2>
        <p className="mt-4 text-base text-white/80 max-w-2xl">
          From capture through activation—structured so marketing and brand teams can move from files to launch.
        </p>
        <div className="mt-10">
          <ProcessTimeline variant="dark" />
        </div>
      </Reveal>

      {/* Why BRIGHTLINE */}
      <Reveal className="mt-20" delay={0.12}>
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">
          Why BRIGHTLINE
        </p>
        <h2 className="font-display text-2xl md:text-3xl text-white mt-2">
          What sets us apart
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {differentiators.map((item) => (
            <div key={item.title} className="border-l-2 border-white/20 pl-5">
              <h3 className="font-medium text-white">{item.title}</h3>
              <p className="mt-2 text-sm text-white/80">{item.description}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Location */}
      <Reveal className="mt-20" delay={0.14}>
        <div className="rounded-[24px] border border-black/10 bg-white p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-black/60">
            Location
          </p>
          <h2 className="font-display text-2xl text-black mt-2">
            Based in New Jersey &amp; New York metro
          </h2>
          <p className="mt-3 text-sm text-black/75 max-w-2xl">
            Local photography for brands and properties across NYC, Brooklyn,
            Jersey City, Hoboken, and the Tri-State area. Timelines are
            typically 2–3 weeks from booking for regional shoots, depending on
            scope.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-xs uppercase tracking-[0.28em] text-black/65">
            <span>New York City</span>
            <span>•</span>
            <span>Brooklyn</span>
            <span>•</span>
            <span>Jersey City</span>
            <span>•</span>
            <span>Hoboken</span>
            <span>•</span>
            <span>New Jersey</span>
            <span>•</span>
            <span>Tri-State Area</span>
          </div>
        </div>
      </Reveal>

      {/* CTA */}
      <Reveal className="mt-20" delay={0.16}>
        <div className="rounded-[28px] border border-black/10 bg-black px-8 py-12 text-white md:px-12">
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">
            Let&apos;s work together
          </p>
          <h2 className="font-display text-2xl md:text-3xl text-white mt-2">
            Ready to build your next visual story?
          </h2>
          <p className="mt-4 text-sm text-white/70 max-w-xl">
            Share your project, timeline, and goals. We respond with a tailored
            scope within 48 hours.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <PrimaryCTA service="general" className="btn btn-light" />
            <BookingButton className="btn btn-outline-light">
              Book a call
            </BookingButton>
            <Link href="/work" className="btn btn-ghost text-white/80 hover:text-white">
              View work
            </Link>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
