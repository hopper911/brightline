import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getProjects } from "@/lib/content";
import { getPublishedPortfolio, sortByCommercialFirst } from "@/lib/portfolio";
import type { WorkHubItem } from "@/app/work/work-hub";

const CATEGORY_ORDER = ["commercial-real-estate", "hospitality", "fashion", "culinary"];

const BLUR_DATA =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iNyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iI2U4ZTllYSIvPjwvc3ZnPg==";

export const metadata: Metadata = {
  title: "Portfolio · Bright Line Photography",
  description:
    "Campaign-ready photography for hospitality, commercial real estate, and fashion clients across the U.S.",
  alternates: {
    canonical: "/portfolio",
  },
  openGraph: {
    title: "Portfolio · Bright Line Photography",
    description:
      "Campaign-ready photography for hospitality, commercial real estate, and fashion clients across the U.S.",
    url: "/portfolio",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "Bright Line Photography" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Portfolio · Bright Line Photography",
    description:
      "Campaign-ready photography for hospitality, commercial real estate, and fashion clients across the U.S.",
    images: ["/og-image.svg"],
  },
};

export default async function PortfolioPage() {
  const contentProjects = getProjects();
  const portfolioItems = await getPublishedPortfolio({ includeDrafts: false });

  const portfolioWorkItems: WorkHubItem[] = portfolioItems.map((p) => ({
    href: `/portfolio/${p.categorySlug}/${p.slug}`,
    slug: p.slug,
    title: p.title,
    category: p.category,
    location: p.location,
    year: p.year,
    cover: p.cover,
    coverAlt: p.coverAlt,
  }));

  const contentWorkItems: WorkHubItem[] = contentProjects
    .filter((c) => !portfolioWorkItems.some((p) => p.slug === c.slug))
    .map((p) => ({
      href: `/work/${p.slug}`,
      slug: p.slug,
      title: p.title,
      category: p.category,
      location: p.location,
      year: p.year,
      cover: p.cover,
    }));

  const merged = [...portfolioWorkItems, ...contentWorkItems];
  const items = sortByCommercialFirst(merged);

  const categoryMap = new Map<string, string>();
  contentProjects.forEach((p) => categoryMap.set(p.categorySlug, p.category));
  portfolioItems.forEach((p) => categoryMap.set(p.categorySlug, p.category));
  const categories = CATEGORY_ORDER.filter((v) => categoryMap.has(v)).map((value) => ({
    value,
    label: categoryMap.get(value) || value,
  }));

  return (
    <div className="section-pad mx-auto max-w-6xl px-6 lg:px-10">
      <h1 className="section-title">Portfolio</h1>
      <p className="section-subtitle mt-2">
        Campaign-ready photography for hospitality, commercial real estate, and fashion clients across the U.S.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group overflow-hidden rounded-2xl border border-black/10 bg-white/80 hover:border-black/20 transition-colors"
          >
            <div className="relative h-[240px] w-full">
              <Image
                src={item.cover}
                alt={item.coverAlt || item.title}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                placeholder="blur"
                blurDataURL={BLUR_DATA}
                className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>
            <div className="p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-black/50">
                {item.category}
              </p>
              <h2 className="mt-3 text-lg text-black">{item.title}</h2>
              <p className="mt-2 text-sm text-black/70">
                {item.location} · {item.year}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-4 text-sm">
        {categories.map((cat) => (
          <Link
            key={cat.value}
            href={`/portfolio/${cat.value}`}
            className="text-black/70 underline-offset-4 hover:underline"
          >
            {cat.label}
          </Link>
        ))}
        <Link
          href="/work"
          className="text-black/70 underline-offset-4 hover:underline"
        >
          All work →
        </Link>
      </div>
    </div>
  );
}
