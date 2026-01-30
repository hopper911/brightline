import Link from "next/link";
import Reveal from "@/components/Reveal";
import PortfolioCard from "@/components/PortfolioCard";
import PrimaryCTA from "@/components/PrimaryCTA";
import { getAdminSession } from "@/lib/admin-auth";
import { getPublishedPortfolio } from "@/lib/portfolio";

export const metadata = {
  title: "Portfolio | Bright Line Photography",
  description:
    "Selected commercial photography projects across hospitality, real estate, and fashion.",
  alternates: {
    canonical: "/portfolio",
  },
  openGraph: {
    title: "Portfolio | Bright Line Photography",
    description:
      "Selected commercial photography projects across hospitality, real estate, and fashion.",
    url: "/portfolio",
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
    title: "Portfolio | Bright Line Photography",
    description:
      "Selected commercial photography projects across hospitality, real estate, and fashion.",
    images: ["/og-image.svg"],
  },
};

export default async function PortfolioPage() {
  const session = await getAdminSession();
  const includeDrafts = Boolean(session);
  const items = await getPublishedPortfolio({ includeDrafts });
  const categories = Array.from(
    new Map(items.map((item) => [item.categorySlug, item.category])).entries()
  );
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="section-title">Portfolio</h1>
      <p className="section-subtitle mt-2">
        Campaign-ready photography for hospitality, commercial real estate, and fashion clients across the U.S.
      </p>
      <div className="card-grid">
        {items.map((item, index) => (
          <Reveal key={item.slug} delay={index * 0.05}>
            <PortfolioCard
              href={`/portfolio/${item.categorySlug}/${item.slug}`}
              cover={item.cover}
              alt={item.coverAlt || item.title}
              tag={item.category}
              title={item.title}
              meta={`${item.location} · ${item.year}`}
            />
          </Reveal>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap items-center gap-3">
        {categories.map(([slug, label]) => (
          <Link
            key={slug}
            href={`/portfolio/${slug}`}
            className="rounded-full border border-black/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-black/60 hover:border-black/40 hover:text-black/80 transition-colors"
          >
            {label}
          </Link>
        ))}
        <Link
          href="/work"
          className="rounded-full border border-black/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-black/60 hover:border-black/40 hover:text-black/80 transition-colors ml-2"
        >
          All work →
        </Link>
      </div>
      <section className="callout mt-16">
        <p className="card-tag">Next project</p>
        <h2 className="callout-title">Let’s build your next visual story.</h2>
        <p className="section-subtitle">
          Tell us about your property, timeline, and intended usage. We respond with a tailored scope within 24 hours.
        </p>
        <PrimaryCTA service="general" />
      </section>
    </div>
  );
}
