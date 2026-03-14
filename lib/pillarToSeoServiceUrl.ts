import type { PillarSlug } from "@/lib/portfolioPillars";

/** Maps each pillar to the primary SEO service landing page for internal linking. */
export const PILLAR_TO_SEO_SERVICE_URL: Record<PillarSlug, string> = {
  architecture: "/architecture-photographer-nyc",
  campaign: "/commercial-photographer-nyc",
  corporate: "/corporate-photographer-nyc",
};

/** Human-readable phrase for "part of" link (e.g. "architecture photography work in NYC and Jersey City") */
export const PILLAR_TO_SEO_LINK_PHRASE: Record<PillarSlug, string> = {
  architecture:
    "architecture photography work in NYC and Jersey City",
  campaign:
    "commercial photography work in NYC and Jersey City",
  corporate:
    "corporate photography work in NYC and Jersey City",
};
