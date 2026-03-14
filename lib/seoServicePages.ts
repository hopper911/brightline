import type { WorkSection } from "@prisma/client";
import { SECTION_TO_PILLAR } from "@/lib/portfolioPillars";
import type { PillarSlug } from "@/lib/portfolioPillars";

export type SeoServicePageSlug =
  | "architecture-photographer-nyc"
  | "commercial-photographer-nyc"
  | "corporate-photographer-nyc"
  | "real-estate-photographer-jersey-city";

export type SeoServicePageConfig = {
  slug: SeoServicePageSlug;
  title: string;
  h1: string;
  intro: string;
  clientTypes: string[];
  /** DB sections for fetching projects */
  sections: WorkSection[];
  locations: string[];
  ctaHeadline: string;
  ctaSubtext: string;
};

export const SEO_SERVICE_PAGES: SeoServicePageConfig[] = [
  {
    slug: "architecture-photographer-nyc",
    title: "Architecture Photographer NYC | Bright Line Photography",
    h1: "Architecture Photography in NYC and Jersey City",
    intro:
      "Professional architecture and interior photography for commercial spaces, office renovations, and design-driven projects. Bright Line Photography captures scale, daylight, and composition so your assets feel premium across web, print, and leasing materials.",
    clientTypes: [
      "Architects",
      "Developers",
      "Interior designers",
      "Commercial real estate teams",
      "Contractors",
    ],
    sections: ["REA", "TRI"],
    locations: [
      "New York City",
      "Manhattan",
      "Brooklyn",
      "Jersey City",
      "Hoboken",
    ],
    ctaHeadline: "Book your architecture photography project",
    ctaSubtext:
      "Share your timeline, location, and deliverables. We'll reply with a tailored estimate within 24 hours.",
  },
  {
    slug: "commercial-photographer-nyc",
    title: "Commercial Photographer NYC | Bright Line Photography",
    h1: "Commercial Photography in NYC and Jersey City",
    intro:
      "Full-service commercial photography for brands, agencies, and properties. Editorial campaigns, brand storytelling, and architectural clarity designed to convert.",
    clientTypes: [
      "Brands and agencies",
      "Creative directors",
      "Marketing teams",
      "Commercial real estate",
      "Hospitality brands",
    ],
    sections: ["ACD", "CUL", "REA", "TRI"],
    locations: [
      "New York City",
      "Manhattan",
      "Brooklyn",
      "Jersey City",
      "Hoboken",
    ],
    ctaHeadline: "Book your commercial photography project",
    ctaSubtext:
      "Share your concept, timeline, and usage needs. We'll reply with a tailored estimate within 24 hours.",
  },
  {
    slug: "corporate-photographer-nyc",
    title: "Corporate Photographer NYC | Bright Line Photography",
    h1: "Corporate Photography in NYC and Jersey City",
    intro:
      "Professional workplace and executive photography for businesses and organizations. Refined imagery for office branding, team pages, and corporate communications.",
    clientTypes: [
      "Office landlords",
      "Workplace teams",
      "HR and communications",
      "Executives",
    ],
    sections: ["BIZ"],
    locations: [
      "New York City",
      "Manhattan",
      "Brooklyn",
      "Jersey City",
      "Hoboken",
    ],
    ctaHeadline: "Book your corporate photography project",
    ctaSubtext:
      "Share your timeline and deliverables. We'll reply with a tailored estimate within 24 hours.",
  },
  {
    slug: "real-estate-photographer-jersey-city",
    title: "Real Estate Photographer Jersey City | Bright Line Photography",
    h1: "Real Estate Photography in Jersey City and NYC",
    intro:
      "Architectural clarity for leasing, investment decks, and luxury developments. We capture scale, daylight, and composition so commercial and residential assets feel premium across web and print.",
    clientTypes: [
      "Commercial real estate teams",
      "Developers",
      "Property managers",
      "Leasing agents",
    ],
    sections: ["REA"],
    locations: [
      "Jersey City",
      "Hoboken",
      "New York City",
      "Manhattan",
      "Brooklyn",
    ],
    ctaHeadline: "Book your real estate photography project",
    ctaSubtext:
      "Share your property, timeline, and deliverables. We'll reply with a tailored estimate within 24 hours.",
  },
];

export const SEO_SERVICE_SLUGS: SeoServicePageSlug[] =
  SEO_SERVICE_PAGES.map((p) => p.slug);

export function getSeoServicePageBySlug(
  slug: string
): SeoServicePageConfig | null {
  return SEO_SERVICE_PAGES.find((p) => p.slug === slug) ?? null;
}

export function getProjectHref(
  section: WorkSection,
  projectSlug: string
): string {
  const pillar = SECTION_TO_PILLAR[section] as PillarSlug;
  return `/work/${pillar}/${projectSlug}`;
}
