import type { GalleryStatus, GalleryType } from "@prisma/client";

/** Statuses where a client with a valid token may load the gallery. */
export const CLIENT_VIEW_ALLOWED_STATUSES: readonly GalleryStatus[] = [
  "SENT",
  "CLIENT_REVIEWING",
  "SELECTIONS_RECEIVED",
  "FINALIZED",
  "DELIVERED",
] as const;

export function isGalleryViewableByClient(gallery: {
  status: GalleryStatus;
  galleryType: GalleryType;
}): boolean {
  if (gallery.galleryType === "INTERNAL_REVIEW") return false;
  return (CLIENT_VIEW_ALLOWED_STATUSES as readonly string[]).includes(gallery.status);
}

/** Proof / pick workflow (toggles + submit). Not used for pure final delivery galleries. */
export function gallerySupportsSelectionWorkflow(gallery: {
  galleryType: GalleryType;
}): boolean {
  return (
    gallery.galleryType === "PROOF" ||
    gallery.galleryType === "SELECTION" ||
    gallery.galleryType === "FINAL_DELIVERY"
  );
}
