import type { Metadata } from "next";
import { getProjects } from "@/lib/content";
import WorkHub from "./work-hub";

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
  const items = getProjects();

  const tags = Array.from(
    new Set(items.flatMap((item) => item.tags))
  ).sort((a, b) => a.localeCompare(b));

  const categories = Array.from(
    new Map(items.map((item) => [item.categorySlug, item.category])).entries()
  ).map(([value, label]) => ({ value, label }));

  return (
    <WorkHub
      items={items}
      tags={tags}
      categories={categories}
    />
  );
}
