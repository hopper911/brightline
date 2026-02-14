import type { Metadata } from "next";
import { getProjects } from "@/lib/content";
import { getPublishedPortfolio, sortByCommercialFirst } from "@/lib/portfolio";
import type { WorkHubItem } from "./work-hub";
import WorkHub from "./work-hub";

const CATEGORY_ORDER = ["commercial-real-estate", "hospitality", "fashion", "culinary"];

export const metadata: Metadata = {
  title: "Work · Bright Line Photography",
  description:
    "Case studies and projects from Bright Line Photography. Commercial photography for hospitality, real estate, and fashion brands.",
  alternates: {
    canonical: "/work",
  },
  openGraph: {
    title: "Work · Bright Line Photography",
    description:
      "Case studies and projects from Bright Line Photography. Commercial photography for hospitality, real estate, and fashion brands.",
    url: "/work",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "Bright Line Photography" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Work · Bright Line Photography",
    description:
      "Case studies and projects from Bright Line Photography. Commercial photography for hospitality, real estate, and fashion brands.",
    images: ["/og-image.svg"],
  },
};

export default async function WorkIndexPage() {
  const contentProjects = getProjects();
  const portfolioItems = await getPublishedPortfolio({ includeDrafts: false });

  const contentWorkItems: WorkHubItem[] = contentProjects.map((p) => ({
    href: `/work/${p.slug}`,
    slug: p.slug,
    title: p.title,
    category: p.category,
    location: p.location,
    year: p.year,
    cover: p.cover,
  }));

  const portfolioWorkItems: WorkHubItem[] = portfolioItems.map((p) => ({
    href: `/work/${p.categorySlug}/${p.slug}`,
    slug: p.slug,
    title: p.title,
    category: p.category,
    location: p.location,
    year: p.year,
    cover: p.cover,
    coverAlt: p.coverAlt,
  }));

  const merged = [
    ...portfolioWorkItems,
    ...contentWorkItems.filter(
      (c) => !portfolioWorkItems.some((p) => p.slug === c.slug)
    ),
  ];
  const items = sortByCommercialFirst(merged);

  const tags = Array.from(
    new Set(contentProjects.flatMap((item) => item.tags))
  ).sort((a, b) => a.localeCompare(b));

  const categoryMap = new Map<string, string>();
  contentProjects.forEach((p) => categoryMap.set(p.categorySlug, p.category));
  portfolioItems.forEach((p) => categoryMap.set(p.categorySlug, p.category));
  const categoryEntries = Array.from(categoryMap.entries());
  const categories = CATEGORY_ORDER.filter((v) =>
    categoryEntries.some(([k]) => k === v)
  ).map((value) => ({
    value,
    label: categoryMap.get(value) || value,
  }));
  const rest = categoryEntries
    .filter(([v]) => !CATEGORY_ORDER.includes(v))
    .map(([value, label]) => ({ value, label }));
  const categoriesOrdered = [...categories, ...rest];

  return (
    <WorkHub
      items={items}
      tags={tags}
      categories={categoriesOrdered}
    />
  );
}
