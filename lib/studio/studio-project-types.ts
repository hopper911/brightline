/**
 * Server-side payload shapes for StudioProject CMS (Phase 1 — types only; no API yet).
 * Prisma model: `StudioProject` (distinct from client portal `Project` and public `WorkProject`).
 */

/** Ordered gallery payload stored in `StudioProject.gallery` JSON column. */
export type StudioProjectGalleryItem =
  | {
      key?: string;
      mediaId?: string;
      sortOrder?: number;
      alt?: string;
    }
  | string;

export type StudioProjectGalleryJson = StudioProjectGalleryItem[];

/** Fields required to create a new StudioProject record. */
export type StudioProjectCreatePayload = {
  title: string;
  /** If omitted at API layer, generate from title (future). */
  slug?: string | null;
  client: string;
  category: string;
  subcategory?: string | null;
  location: string;
  year: number;
  opening: string;
  context: string;
  approach: string;
  highlight: string;
  execution?: string | null;
  closing: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  tags?: string[];
  credits?: string | null;
  featured?: boolean;
  published?: boolean;
  publishedAt?: Date | string | null;
  contentStatus?: string | null;
  captionDrafted?: boolean;
  websiteCopyDrafted?: boolean;
  contentPosted?: boolean;
  reusableLater?: boolean;
  heroImageId?: string | null;
  /** Must serialize to JSON array/object; default `[]`. */
  gallery?: StudioProjectGalleryJson | Record<string, unknown>;
};

/** Partial update (API layer will merge with existing row later). */
export type StudioProjectUpdatePayload = Partial<
  Omit<StudioProjectCreatePayload, "year">
> & {
  year?: number;
};
