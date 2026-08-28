/**
 * Platform DTOs for Brightline public marketing content (Phase 5C).
 * Excludes client delivery, gallery tokens, and internal ops metadata.
 */

export type BrightlineWorkProjectSnapshot = {
  title: string;
  slug: string;
  pillarSlug: string;
  section: string;
  summary: string | null;
  location: string | null;
  year: number | null;
  isFeatured: boolean;
  seoTitle: string | null;
  metaDescription: string | null;
};

export type BrightlinePortfolioProjectSnapshot = {
  title: string;
  slug: string;
  categorySlug: string;
  location: string | null;
  year: string | null;
  description: string | null;
  imageCount: number;
  seoTitle: string | null;
  seoDescription: string | null;
};

export type BrightlinePublicContentStatus = {
  lifecycle: "draft" | "published" | "archived";
  published: boolean;
  updatedAt: string | null;
};

/** Keys that must never appear on platform Brightline content payloads. */
export const BRIGHTLINE_EXCLUDED_PLATFORM_FIELDS = [
  "finalPackageToken",
  "finalPackageExpiresAt",
  "attachedInvoiceId",
  "clientPdfGeneratedAt",
  "deliveryPreparedAt",
  "clientEmail",
  "accessCode",
  "codeHash",
  "galleryImages",
  "images",
  "deliveryPackages",
  "privateNotes",
] as const;
