import {
  CANONICAL_SITE_ORIGIN,
  LEGAL_STUDIO_NAME,
  SERVICE_AREA_LOCATIONS,
} from "@/lib/truth/brand-lock";

/** Canonical brand config. Service area + origin locked via lib/truth/brand-lock. */
export const BRAND = Object.freeze({
  name: LEGAL_STUDIO_NAME,
  url: CANONICAL_SITE_ORIGIN,
  metadata: Object.freeze({
    description:
      "Premium visual studio: photography with structured delivery and intelligent systems—assets prepared for web, search, and social. Architecture, advertising, and corporate.",
    ogImage: "/og-image.svg",
    twitterCard: "summary_large_image" as const,
  }),
  assets: Object.freeze({
    monogram: "/brand/brightline-bl-monogram.png",
    wordmark: "/brand/brightline-photography-wordmark.png",
  }),
  contact: Object.freeze({
    email: "info@brightlinephotography.com",
    /** Service area for hero, footer, and project rules—NJ/NY metro only (no Miami / worldwide). */
    locations: Object.freeze([...SERVICE_AREA_LOCATIONS]) as unknown as string[],
  }),
  social: Object.freeze({
    instagram: "",
    linkedin: "",
  }),
  booking: Object.freeze({
    enabled: false,
    calendlyUrl: "",
  }),
});

export function getUrl(path?: string) {
  if (!path) return BRAND.url;
  if (path.startsWith("http")) return path;
  return `${BRAND.url}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function getMailtoLink(email: string = BRAND.contact.email) {
  return `mailto:${email}`;
}

export function getImageAltFallback(category?: string): string {
  if (category) return `${category} photography by ${BRAND.name}`;
  return `Photography by ${BRAND.name}`;
}
