/** Maps each default pillar to the primary SEO service landing page for internal linking. */
export const PILLAR_TO_SEO_SERVICE_URL: Record<string, string> = {
  architecture: "/architecture-photographer-nyc",
  advertising: "/commercial-photographer-nyc",
  corporate: "/corporate-photographer-nyc",
};

/** Human-readable phrase for "part of" link (e.g. "architecture photography work in NYC and Jersey City") */
export const PILLAR_TO_SEO_LINK_PHRASE: Record<string, string> = {
  architecture: "architecture photography work in NYC and Jersey City",
  advertising: "commercial photography work in NYC and Jersey City",
  corporate: "corporate photography work in NYC and Jersey City",
};

export function getPillarSeoServiceUrl(slug: string): string {
  return PILLAR_TO_SEO_SERVICE_URL[slug] ?? "/services";
}

export function getPillarSeoLinkPhrase(slug: string): string {
  return (
    PILLAR_TO_SEO_LINK_PHRASE[slug] ??
    "commercial photography work in NYC and Jersey City"
  );
}
