import {
  extractInstagramPermalink,
  extractYouTubeId,
  type BlogPostVideo,
} from "@/lib/blog-post-model";
import { proxiedInstagramThumbUrl } from "@/lib/instagram-thumb-proxy";
import {
  youtubeThumbnailUrl,
  youtubeThumbnailCandidates,
} from "@/lib/blog-video-thumbs-client";

export type PreparedBlogVideo = {
  video: BlogPostVideo;
  thumbnailUrl: string | null;
  youtubeMode: "embed" | "external" | null;
};

export { youtubeThumbnailUrl, youtubeThumbnailCandidates };

const ytEmbedCache = new Map<string, { ok: boolean; expiresAt: number }>();
const YT_EMBED_TTL_MS = 15 * 60_000;

/** Returns true when YouTube oEmbed succeeds (embed usually allowed). */
export async function isYouTubeEmbeddable(videoUrlOrId: string): Promise<boolean> {
  const id = extractYouTubeId(videoUrlOrId);
  if (!id) return false;

  const cached = ytEmbedCache.get(id);
  if (cached && cached.expiresAt > Date.now()) return cached.ok;

  const watch = `https://www.youtube.com/watch?v=${id}`;
  let ok = false;
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(watch)}&format=json`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) }
    );
    ok = res.ok;
  } catch {
    ok = false;
  }

  ytEmbedCache.set(id, { ok, expiresAt: Date.now() + YT_EMBED_TTL_MS });
  return ok;
}

/**
 * Same-origin proxied Instagram thumb URL for the card.
 * Admin posterUrl (resolved R2 / gallery) wins when set.
 */
export function instagramDisplayThumbUrl(
  permalink: string,
  posterUrl?: string | null
): string | null {
  const cleanPoster = posterUrl?.trim();
  if (cleanPoster) return cleanPoster;
  const normalized = extractInstagramPermalink(permalink);
  if (!normalized) return null;
  return proxiedInstagramThumbUrl(normalized);
}

/**
 * Prefer proxy URL so browsers never load Instagram CDN directly.
 * (OG scrape moved to /api/blog/instagram-thumb.)
 */
export async function resolveInstagramThumbnail(permalinkInput: string): Promise<string | null> {
  const permalink = extractInstagramPermalink(permalinkInput);
  if (!permalink) return null;
  return proxiedInstagramThumbUrl(permalink);
}
