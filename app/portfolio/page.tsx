import Link from "next/link";
import { cookies } from "next/headers";
import Reveal from "@/components/Reveal";
import PortfolioCard from "@/components/PortfolioCard";
import { getPublishedPortfolio } from "@/lib/portfolio";

export const metadata = {
  title: "Portfolio | Bright Line Photography",
  description:
    "Selected commercial photography projects across hospitality, real estate, and fashion.",
};

export default async function PortfolioPage() {
  const cookieStore = await cookies();
  const includeDrafts = cookieStore.get("admin_access")?.value === "true";
  const items = await getPublishedPortfolio({ includeDrafts });
  const categories = Array.from(
    new Map(items.map((item) => [item.categorySlug, item.category])).entries()
  );
  return (
    <div>
      <h1 className="section-title">Portfolio</h1>
      <p className="section-subtitle">
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
      <div className="mt-10 flex flex-wrap gap-3">
        {categories.map(([slug, label]) => (
          <Link
            key={slug}
            href={`/portfolio/${slug}`}
            className="rounded-full border border-black/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-black/60"
          >
            {label}
          </Link>
        ))}
      </div>
      <section className="callout">
        <p className="card-tag">Next project</p>
        <h2 className="callout-title">Let’s build your next visual story.</h2>
        <p className="section-subtitle">
          Tell us about your property, timeline, and intended usage. We respond with a tailored scope within 24 hours.
        </p>
        <Link className="btn btn-primary" href="/contact">
          Request availability
        </Link>
      </section>
    </div>
  );
}
