import type { Metadata } from "next";
import SeoServicePage from "@/components/SeoServicePage";
import { getSeoServicePageBySlug } from "@/lib/seoServicePages";
import { getPublishedProjectsBySections } from "@/lib/queries/work";
import { BRAND } from "@/lib/config/brand";

export const dynamic = "force-dynamic";

const SLUG = "real-estate-photographer-jersey-city";

export const metadata: Metadata = {
  title: "Real Estate Photographer Jersey City | Bright Line Photography",
  description:
    "Commercial and residential real estate photography in Jersey City and NYC. Leasing, investment decks, and luxury developments.",
  alternates: { canonical: `/${SLUG}` },
  openGraph: {
    title: "Real Estate Photographer Jersey City | Bright Line Photography",
    description:
      "Commercial and residential real estate photography in Jersey City and NYC.",
    url: `${BRAND.url}/${SLUG}`,
    images: [{ url: `${BRAND.url}/og-image.svg`, width: 1200, height: 630, alt: BRAND.name }],
  },
};

export default async function RealEstatePhotographerJerseyCityPage() {
  const config = getSeoServicePageBySlug(SLUG);
  if (!config) return null;

  let projects;
  try {
    projects = await getPublishedProjectsBySections(config.sections);
  } catch {
    projects = [];
  }

  return <SeoServicePage config={config} projects={projects} />;
}
