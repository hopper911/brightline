/**
 * Client-safe image utilities.
 * This file contains only functions that can run in the browser.
 * For server-side storage operations, use lib/image-strategy.ts instead.
 */

export type ImageMode = "marketing" | "client";

/**
 * Determine if a URL is a signed client URL or a public marketing URL.
 */
export function getImageModeForUrl(url: string): ImageMode {
  if (!url) return "marketing";
  const lowered = url.toLowerCase();
  if (lowered.includes("x-amz-signature") || lowered.includes("x-amz-expires")) {
    return "client";
  }
  return "marketing";
}
