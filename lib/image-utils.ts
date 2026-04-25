/**
 * Helpers for Next/Image and gallery markup.
 * `data-image-mode` is used for styling / analytics hooks on client galleries.
 */
export function getImageModeForUrl(url: string): "remote" | "data" | "unknown" {
  if (!url) return "unknown";
  if (url.startsWith("data:")) return "data";
  return "remote";
}
