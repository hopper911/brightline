import Reveal from "@/components/Reveal";
import BlogPostVideosClient from "@/components/blog/BlogPostVideosClient";
import {
  extractInstagramPermalink,
  extractYouTubeId,
  hasBlogVideos,
  isRenderableBlogVideo,
  cleanVideoPosterUrl,
  type BlogPostVideo,
} from "@/lib/blog-post-model";
import { getPublicR2Url } from "@/lib/r2";
import {
  instagramDisplayThumbUrl,
  isYouTubeEmbeddable,
  youtubeThumbnailUrl,
  type PreparedBlogVideo,
} from "@/lib/blog-video-thumbs";

type BlogPostVideosProps = {
  videos: BlogPostVideo[];
  title: string;
  reveal?: boolean;
  className?: string;
  /** Cover / gallery still used when no per-video poster is set. */
  fallbackPosterUrl?: string | null;
};

function resolvePoster(raw?: string | null): string | null {
  const cleaned = cleanVideoPosterUrl(raw || "");
  if (!cleaned) return null;
  return getPublicR2Url(cleaned) || cleaned;
}

async function prepareVideo(
  video: BlogPostVideo,
  fallbackPosterUrl?: string | null
): Promise<PreparedBlogVideo | null> {
  if (!isRenderableBlogVideo(video)) return null;

  if (video.provider === "youtube") {
    const id = extractYouTubeId(video.url);
    if (!id) return null;
    const poster =
      resolvePoster(video.posterUrl) ||
      resolvePoster(fallbackPosterUrl) ||
      youtubeThumbnailUrl(id, "hq");
    const embeddable = await isYouTubeEmbeddable(video.url);
    return {
      video,
      thumbnailUrl: poster,
      youtubeMode: embeddable ? "embed" : "external",
    };
  }

  if (video.provider === "instagram") {
    const permalink = extractInstagramPermalink(video.url);
    if (!permalink) return null;
    const fromPoster =
      resolvePoster(video.posterUrl) || resolvePoster(fallbackPosterUrl);
    return {
      video: { ...video, url: permalink },
      thumbnailUrl: instagramDisplayThumbUrl(permalink, fromPoster),
      youtubeMode: null,
    };
  }

  return {
    video,
    thumbnailUrl: resolvePoster(video.posterUrl) || resolvePoster(fallbackPosterUrl),
    youtubeMode: null,
  };
}

/** Server wrapper: resolve thumbs + YouTube embed status, then render dark cards. */
export default async function BlogPostVideos({
  videos,
  title,
  reveal = true,
  className = "mt-12",
  fallbackPosterUrl = null,
}: BlogPostVideosProps) {
  const list = (videos ?? []).filter(isRenderableBlogVideo);
  if (!hasBlogVideos(list)) return null;

  const prepared = (
    await Promise.all(list.map((video) => prepareVideo(video, fallbackPosterUrl)))
  ).filter((item): item is PreparedBlogVideo => Boolean(item));

  if (!prepared.length) return null;

  const body = <BlogPostVideosClient items={prepared} title={title} />;

  if (!reveal) {
    return <div className={className}>{body}</div>;
  }

  return (
    <Reveal className={className} delay={0.09}>
      {body}
    </Reveal>
  );
}
