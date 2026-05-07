import type { NextResponse } from "next/server";
import { jsonErr } from "@/lib/api/http";
import {
  imageBelongsToGallery,
  loadClientGallerySession,
} from "@/lib/client-gallery-session";

export { imageBelongsToGallery } from "@/lib/client-gallery-session";

type Loaded = Awaited<ReturnType<typeof loadClientGallerySession>>;

/** Map a failed gallery session load to a consistent API response. */
export function clientGallerySessionErrorResponse(loaded: Extract<Loaded, { ok: false }>): NextResponse {
  return jsonErr(loaded.error, loaded.status);
}

/** Ensure `imageId` exists on the session-bound gallery (prevents cross-gallery image toggles). */
export function guardImageInClientGallery(
  loaded: Extract<Loaded, { ok: true }>,
  imageId: string | undefined
): NextResponse | null {
  if (!imageId?.trim()) {
    return jsonErr("imageId is required.", 400);
  }
  if (!imageBelongsToGallery(loaded.access.gallery, imageId.trim())) {
    return jsonErr("Image not found.", 404);
  }
  return null;
}
