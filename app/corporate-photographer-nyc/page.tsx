import type { Metadata } from "next";
import SeoServicePage from "@/components/SeoServicePage";
import { getSeoServicePageBySlug } from "@/lib/seoServicePages";
import { getPublishedProjectsBySections } from "@/lib/queries/work";
import { BRAND } from "@/lib/config/brand";

export const dynamic = "force-dynamic";

const SLUG = "corporate-photographer-nyc";

export const metadata: Metadata = {
  title: "Corporate Photographer NYC | Bright Line Photography",
  description:
    "Professional workplace and executive photography in NYC and Jersey City. Office branding, team pages, and corporate communications.",
  alternates: { canonical: `/${SLUG}` },
  openGraph: {
    title: "Corporate Photographer NYC | Bright Line Photography",
    description:
      "Professional workplace and executive photography in NYC and Jersey City.",
    url: `${BRAND.url}/${SLUG}`,
    images: [{ url: `${BRAND.url}/og-image.svg`, width: 1200, height: 630, alt: BRAND.name }],
  },
};

export default async function CorporatePhotographerNYCPage() {
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
