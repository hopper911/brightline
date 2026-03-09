export const metadata = {
  title: "About | Bright Line Photography",
  description:
    "A commercial photography studio specializing in architecture, real estate, and editorial work. Based in New York and Miami.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About | Bright Line Photography",
    description:
      "A commercial photography studio specializing in architecture, real estate, and editorial work. Based in New York and Miami.",
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
      "A commercial photography studio specializing in architecture, real estate, and editorial work. Based in New York and Miami.",
    images: ["/og-image.svg"],
  },
};

import Link from "next/link";
import Reveal from "@/components/Reveal";
import PrimaryCTA from "@/components/PrimaryCTA";
import CredibilityBar from "@/components/CredibilityBar";
import ProcessTimeline from "@/components/ProcessTimeline";
import BookingButton from "@/components/BookingButton";

const capabilities = [
  "Art direction & concept",
  "On-location production",
  "Color & post-production",
  "Multi-channel delivery",
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
      "Proofs in 5-7 days, finals in 10-14 days. Rush timelines available for campaign deadlines.",
  },
  {
    title: "Long-term partnerships",
    description:
      "Many clients return for seasonal refreshes and campaign expansions. We build systems that scale.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 lg:px-10 section-pad py-16">
      {/* Hero Section */}
      <Reveal>
        <p className="text-xs uppercase tracking-[0.35em] text-black/50">
          About Bright Line
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-black mt-2 max-w-3xl">
          A studio built for brands that move fast.
        </h1>
        <p className="mt-6 text-base md:text-lg text-black/70 max-w-2xl">
          Bright Line is a commercial photography studio delivering imagery for
          architecture, real estate, and fashion teams that demand clarity,
          consistency, and quiet luxury. We collaborate on creative direction,
          shot lists, and post-production to keep every channel cohesive.
        </p>
      </Reveal>

      {/* Credibility Stats */}
      <Reveal className="mt-12" delay={0.04}>
        <div className="rounded-[24px] border border-black/10 bg-black/5 p-6 md:p-8">
          <CredibilityBar variant="light" showDescription />
        </div>
      </Reveal>

      {/* Founder */}
      <Reveal className="mt-20" delay={0.06}>
        <div className="grid gap-8 md:grid-cols-[0.4fr_1fr] md:items-start">
          <div className="rounded-[20px] border border-black/10 bg-black/5 p-4 text-center">
            <div className="mx-auto h-24 w-24 rounded-full bg-black/10" />
            <p className="mt-4 font-medium text-black">Studio Principal</p>
            <p className="text-sm text-black/60">New York / Miami</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-black/50">
              The Studio
            </p>
            <h2 className="font-display text-2xl md:text-3xl text-black mt-2">
              Built by practitioners, not just photographers.
            </h2>
            <p className="mt-4 text-base text-black/70">
              Bright Line started from a simple frustration: too many commercial shoots
              run over budget, miss deadlines, or deliver imagery that doesn&apos;t scale
              across channels. We built a studio around production discipline—clear
              shot lists, efficient capture days, and delivery systems designed for
              marketing teams who move fast.
            </p>
            <p className="mt-4 text-base text-black/70">
              Every project gets the same level of care: pre-production that prevents
              surprises, on-set direction that captures what you actually need, and
              post-production that delivers consistent, channel-ready assets.
            </p>
          </div>
        </div>
      </Reveal>

      {/* What Clients Get */}
      <Reveal className="mt-20" delay={0.07}>
        <p className="text-xs uppercase tracking-[0.35em] text-black/50">
          Outcomes
        </p>
        <h2 className="font-display text-2xl md:text-3xl text-black mt-2">
          What clients get
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-[16px] border border-black/10 bg-white p-5">
            <p className="font-medium text-black">Brand-ready imagery</p>
            <p className="mt-2 text-sm text-black/60">
              Every deliverable is color-corrected, retouched, and optimized for
              your brand guidelines—no additional editing needed.
            </p>
          </div>
          <div className="rounded-[16px] border border-black/10 bg-white p-5">
            <p className="font-medium text-black">Consistent visual system</p>
            <p className="mt-2 text-sm text-black/60">
              From hero shots to detail crops, your assets feel cohesive across
              web, social, and print applications.
            </p>
          </div>
          <div className="rounded-[16px] border border-black/10 bg-white p-5">
            <p className="font-medium text-black">Decision-maker visuals</p>
            <p className="mt-2 text-sm text-black/60">
              Imagery designed to convert—whether you&apos;re selling rooms,
              leasing space, or launching a campaign.
            </p>
          </div>
        </div>
      </Reveal>

      {/* Industries */}
      <Reveal className="mt-20" delay={0.08}>
        <p className="text-xs uppercase tracking-[0.35em] text-black/50">
          Industries
        </p>
        <h2 className="font-display text-2xl md:text-3xl text-black mt-2">
          Who we work with
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {industries.map((industry) => (
            <div
              key={industry.name}
              className="rounded-[16px] border border-black/10 bg-white p-5"
            >
              <h3 className="font-medium text-black">{industry.name}</h3>
              <p className="mt-1 text-sm text-black/60">{industry.description}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Capabilities */}
      <Reveal className="mt-20" delay={0.08}>
        <p className="text-xs uppercase tracking-[0.35em] text-black/50">
          Capabilities
        </p>
        <h2 className="font-display text-2xl md:text-3xl text-black mt-2">
          End-to-end production
        </h2>
        <p className="mt-4 text-base text-black/70 max-w-2xl">
          From pre-production to final delivery, we handle every stage of the
          shoot. Our team works across New York, Miami, and destination
          locations to build visual systems that last.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {capabilities.map((v) => (
            <span
              key={v}
              className="rounded-full border border-black/20 px-4 py-2 text-xs uppercase tracking-[0.28em] text-black/60"
            >
              {v}
            </span>
          ))}
        </div>
      </Reveal>

      {/* Process */}
      <Reveal className="mt-20" delay={0.1}>
        <p className="text-xs uppercase tracking-[0.35em] text-black/50">
          Process
        </p>
        <h2 className="font-display text-2xl md:text-3xl text-black mt-2">
          How we work
        </h2>
        <p className="mt-4 text-base text-black/70 max-w-2xl">
          A streamlined workflow designed for busy marketing teams. We handle
          the complexity so you can focus on launch.
        </p>
        <div className="mt-10">
          <ProcessTimeline variant="light" />
        </div>
      </Reveal>

      {/* Why Bright Line */}
      <Reveal className="mt-20" delay={0.12}>
        <p className="text-xs uppercase tracking-[0.35em] text-black/50">
          Why Bright Line
        </p>
        <h2 className="font-display text-2xl md:text-3xl text-black mt-2">
          What sets us apart
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {differentiators.map((item) => (
            <div key={item.title} className="border-l-2 border-black/10 pl-5">
              <h3 className="font-medium text-black">{item.title}</h3>
              <p className="mt-2 text-sm text-black/70">{item.description}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Location */}
      <Reveal className="mt-20" delay={0.14}>
        <div className="rounded-[24px] border border-black/10 bg-white p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-black/50">
            Location
          </p>
          <h2 className="font-display text-2xl text-black mt-2">
            Based in New York & Miami
          </h2>
          <p className="mt-3 text-sm text-black/70 max-w-2xl">
            We shoot nationwide and internationally. Travel is quoted separately
            based on project scope and logistics. Most East Coast projects can
            be scheduled within 2-3 weeks of booking.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-xs uppercase tracking-[0.28em] text-black/50">
            <span>New York, NY</span>
            <span>•</span>
            <span>Miami, FL</span>
            <span>•</span>
            <span>Available Worldwide</span>
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
