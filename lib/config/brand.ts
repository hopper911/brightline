export const BRAND = {
  name: "BRIGHTLINE Photography",
  url: "https://brightlinephotography.com",
  metadata: {
    description:
      "Premium visual studio: photography with structured delivery and intelligent systems—assets prepared for web, search, and social. Architecture, advertising, and corporate.",
    ogImage: "/og-image.svg",
    twitterCard: "summary_large_image" as const,
  },
  assets: {
    monogram: "/brand/brightline-bl-monogram.png",
    wordmark: "/brand/brightline-photography-wordmark.png",
  },
  contact: {
    email: "info@brightlinephotography.com",
    /** Service area for hero, footer, and project rules—NJ/NY metro only (no Miami / worldwide). */
    locations: [
      "New York City",
      "Brooklyn",
      "Jersey City",
      "Hoboken",
      "New Jersey",
      "Tri-State Area",
    ],
  },
  social: {
    instagram: "",
    linkedin: "",
  },
  booking: {
    enabled: false,
    calendlyUrl: "",
  },
};

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
