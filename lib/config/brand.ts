/**
 * Bright Line Photography - Brand Constants
 * Single source of truth for contact info, URLs, and brand metadata
 */

export const BRAND = {
  name: "Bright Line Photography",
  tagline: "Commercial photography for hospitality, real estate, and fashion brands",
  
  contact: {
    email: "hello@brightlinephotography.co",
    phone: "+1 (212) 555-0139", // Note: Update with real number or remove if not using
    locations: ["Miami", "New York", "Available Worldwide"],
  },
  
  domain: "brightlinephotography.co",
  url: "https://brightlinephotography.co",
  
  social: {
    instagram: "", // Add when available
    linkedin: "",  // Add when available
    twitter: "",   // Add when available
  },
  
  booking: {
    calendlyUrl: process.env.NEXT_PUBLIC_CALENDLY_URL || "", // e.g., "https://calendly.com/brightline/consultation"
    enabled: Boolean(process.env.NEXT_PUBLIC_CALENDLY_URL),
  },
  
  metadata: {
    description: "Commercial photography for hospitality, real estate, and fashion brands.",
    ogImage: "/og-image.svg",
    twitterCard: "summary_large_image",
  },
  
  // Email notifications
  notifications: {
    from: "Bright Line <no-reply@brightlinephotography.co>",
    contactNotify: process.env.CONTACT_NOTIFY_EMAIL || "hello@brightlinephotography.co",
  },
} as const;

// Helper to get full URL for a path
export function getUrl(path: string = ""): string {
  return `${BRAND.url}${path}`;
}

// Helper for mailto link
export function getMailtoLink(subject?: string): string {
  const base = `mailto:${BRAND.contact.email}`;
  return subject ? `${base}?subject=${encodeURIComponent(subject)}` : base;
}
