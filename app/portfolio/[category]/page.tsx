import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import PortfolioCard from "@/components/PortfolioCard";
import { getAdminSession } from "@/lib/admin-auth";
import { getPublishedPortfolio } from "@/lib/portfolio";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const session = await getAdminSession();
  const includeDrafts = Boolean(session);
  const items = await getPublishedPortfolio({ includeDrafts });
  const categories = Array.from(
    new Map(items.map((item) => [item.categorySlug, item.category])).entries()
  );
  const categoryLabel = categories.find(([slug]) => slug === category)?.[1];
  const label = categoryLabel ?? "Portfolio";
  const description = `View ${label.toLowerCase()} photography projects and case studies from Bright Line Photography.`;

  return {
    title: `${label} · Bright Line Photography`,
    description,
    alternates: {
      canonical: `/portfolio/${category}`,
    },
    openGraph: {
      title: `${label} · Bright Line Photography`,
      description,
      url: `/portfolio/${category}`,
      images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: `${label} Photography` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${label} · Bright Line Photography`,
      description,
      images: ["/og-image.svg"],
    },
  };
}

export default async function PortfolioCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const session = await getAdminSession();
  const includeDrafts = Boolean(session);
  const items = await getPublishedPortfolio({ includeDrafts });
  const categories = Array.from(
    new Map(items.map((item) => [item.categorySlug, item.category])).entries()
  );
  const rawCategory = typeof category === "string" ? category : "";
  const categoryLabel =
    categories.find(([slug]) => slug === rawCategory)?.[1] ??
    (rawCategory ? rawCategory.replace(/-/g, " ") : "Portfolio");

  const categoryItems = items.filter(
    (item) => item.categorySlug === category
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <Reveal className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-black/50">
            Portfolio Category
          </p>
          <h1 className="font-display text-4xl text-black">{categoryLabel}</h1>
        </div>
        <Link
          href="/portfolio"
          className="rounded-full border border-black/20 px-5 py-2 text-xs uppercase tracking-[0.32em] text-black/70"
        >
          View all work
        </Link>
      </Reveal>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {categoryItems.map((item, index) => (
          <Reveal key={item.slug} delay={index * 0.07}>
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
    </div>
  );
}
