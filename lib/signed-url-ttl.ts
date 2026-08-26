/** Caps for presigned R2 GET URLs — keep private vault windows short. */
export const SIGNED_URL_TTL = {
  publicMediaRedirectSec: 300,
  packagePreviewSec: 300,
  packageDownloadSec: 300,
  clientGalleryViewSec: 600,
  clientGalleryDownloadSec: 600,
  adminPreviewSec: 300,
  /** Hard ceiling for any admin-requested expiresIn body param. */
  adminSignMaxSec: 3600,
} as const;

export function clampSignedUrlExpiresIn(
  requested: number | undefined,
  fallback: number,
  max = SIGNED_URL_TTL.adminSignMaxSec
): number {
  const n = typeof requested === "number" && Number.isFinite(requested) ? Math.floor(requested) : fallback;
  if (n < 60) return 60;
  return Math.min(n, max);
}
