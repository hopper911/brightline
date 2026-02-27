export const BRAND = {
  name: "Bright Line Photography",
  url: "https://brightlinephotography.co",
  metadata: {
    description:
      "Commercial real estate, architecture, and fashion photography. Editorial imagery for brands that want quiet luxury and commercial clarity.",
    ogImage: "/og-image.svg",
    twitterCard: "summary_large_image",
  },
  contact: {
    email: "hello@brightlinephotography.co",
    locations: ["New York", "Los Angeles"],
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
