import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import Reveal from "@/components/Reveal";
import PortfolioCard from "@/components/PortfolioCard";
import { getPublishedPortfolio } from "@/lib/portfolio";

export async function generateMetadata({
  params,
}: {
  params: { category: string };
}): Promise<Metadata> {
  const cookieStore = await cookies();
  const includeDrafts = cookieStore.get("admin_access")?.value === "true";
  const items = await getPublishedPortfolio({ includeDrafts });
  const categories = Array.from(
    new Map(items.map((item) => [item.categorySlug, item.category])).entries()
  );
  const categoryLabel = categories.find(([slug]) => slug === params.category)?.[1];
  const label = categoryLabel ?? "Portfolio";

  return {
    title: `${label} | Bright Line Photography`,
    description: `View ${label.toLowerCase()} photography projects and case studies.`,
  };
}

export default async function PortfolioCategoryPage({
  params,
}: {
  params: { category: string };
}) {
  const cookieStore = await cookies();
  const includeDrafts = cookieStore.get("admin_access")?.value === "true";
  const items = await getPublishedPortfolio({ includeDrafts });
  const categories = Array.from(
    new Map(items.map((item) => [item.categorySlug, item.category])).entries()
  );
  const rawCategory = typeof params.category === "string" ? params.category : "";
  const categoryLabel =
    categories.find(([slug]) => slug === rawCategory)?.[1] ??
    (rawCategory ? rawCategory.replace(/-/g, " ") : "Portfolio");

  const categoryItems = items.filter(
    (item) => item.categorySlug === params.category
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
