/**
 * Brand / service-area lock — permanent.
 * Source of truth for locations remains BRAND.contact.locations;
 * this module freezes the required set so it cannot silently shrink.
 */

export const CANONICAL_SITE_ORIGIN = "https://brightlinephotography.com" as const;

export const SERVICE_AREA_LOCATIONS = Object.freeze([
  "New York City",
  "Brooklyn",
  "Jersey City",
  "Hoboken",
  "New Jersey",
  "Tri-State Area",
] as const);

export const LEGAL_STUDIO_NAME = "BRIGHTLINE Photography" as const;
