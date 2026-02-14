export const BRAND = {
  name: "Bright Line Photography",
  url: "https://brightlinephotography.co",
  metadata: {
    description:
      "Commercial photography studio specializing in hospitality, real estate, and fashion brands.",
    ogImage: "/og-image.svg",
    twitterCard: "summary_large_image" as const,
  },
  contact: {
    email: "hello@brightlinephotography.co",
    locations: ["New York", "Miami", "Remote"],
  },
  booking: {
    enabled: Boolean(process.env.NEXT_PUBLIC_CALENDLY_URL),
    calendlyUrl: process.env.NEXT_PUBLIC_CALENDLY_URL || "",
  },
  social: {
    instagram: "",
    linkedin: "",
    behance: "",
  },
};

export function getUrl(path: string) {
  if (!path) return BRAND.url;
  if (path.startsWith("http")) return path;
  return `${BRAND.url}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function getMailtoLink(email: string = BRAND.contact.email) {
  return `mailto:${email}`;
}

/** Fallback alt text when image has no explicit alt. */
export function getImageAltFallback(category?: string): string {
  if (category) return `${category} photography by ${BRAND.name}`;
  return `Photography by ${BRAND.name}`;
}
