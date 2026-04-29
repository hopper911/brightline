import type { Metadata } from "next";
import SeoServicePage from "@/components/SeoServicePage";
import { getSeoServicePageBySlug } from "@/lib/seoServicePages";
import { getPublishedProjectsBySections } from "@/lib/queries/work";
import { getSectionToPillarSlugMap } from "@/lib/work-pillar-settings";
import { BRAND } from "@/lib/config/brand";

export const dynamic = "force-dynamic";

const SLUG = "commercial-photographer-nyc";

export const metadata: Metadata = {
  title: "Commercial Photographer NYC | BRIGHTLINE Photography",
  description:
    "Commercial photography in NYC and Jersey City—advertising, brand, and architectural work with structured, channel-ready delivery.",
  alternates: { canonical: `/${SLUG}` },
  openGraph: {
    title: "Commercial Photographer NYC | BRIGHTLINE Photography",
    description:
      "Commercial photography in NYC and Jersey City with structured delivery.",
    url: `${BRAND.url}/${SLUG}`,
    images: [{ url: `${BRAND.url}/og-image.svg`, width: 1200, height: 630, alt: BRAND.name }],
  },
};

export default async function CommercialPhotographerNYCPage() {
  const config = getSeoServicePageBySlug(SLUG);
  if (!config) return null;

  let projects: Awaited<ReturnType<typeof getPublishedProjectsBySections>> = [];
  try {
    projects = await getPublishedProjectsBySections(config.sections);
  } catch {
    projects = [];
  }

  const sectionToPillar = await getSectionToPillarSlugMap();

  return (
    <SeoServicePage config={config} projects={projects} sectionToPillar={sectionToPillar} />
  );
}
