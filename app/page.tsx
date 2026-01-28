import Link from "next/link";
import HomeHero from "@/components/HomeHero";
import Reveal from "@/components/Reveal";
import PortfolioCard from "@/components/PortfolioCard";

export const metadata = {
  title: "Commercial Photography | Bright Line Photography",
  description:
    "Commercial real estate, hospitality, and fashion photography in NYC and beyond.",
};

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

export default function Page() {
  return (
    <div className="page-shell min-h-screen">
      <div className="soft-grid">
        <HomeHero />

        <Reveal className="relative mx-auto max-w-6xl px-4 pb-20 pt-12">
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
                  className="h-full w-full object-cover image-fade"
                />
              </div>
            </div>
        </Link>
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
          <Link
            href="/contact"
            className="group block"
            aria-label="Read client feedback and start a project"
          >
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
            <span className="mt-6 inline-flex items-center text-xs uppercase tracking-[0.3em] text-black/60">
              Discuss your project
            </span>
          </Link>
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
                <Link
                  href="/contact"
                  className="btn btn-light"
                >
                  Start a Project
                </Link>
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

        <footer className="border-t border-black/10">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-xs uppercase tracking-[0.3em] text-black/50 md:flex-row md:items-center md:justify-between">
            <span>© {new Date().getFullYear()} Bright Line Photography</span>
            <span>hello@brightlinephotography.co</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
