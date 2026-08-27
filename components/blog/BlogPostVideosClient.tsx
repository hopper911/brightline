"use client";

import VideoEmbed from "@/components/VideoEmbed";
import PublicInlineVideo from "@/components/PublicInlineVideo";
import InstagramEmbed from "@/components/blog/InstagramEmbed";
import {
  extractInstagramPermalink,
  extractYouTubeId,
} from "@/lib/blog-post-model";
import type { PreparedBlogVideo } from "@/lib/blog-video-thumbs";
import { getPublicR2Url } from "@/lib/r2";

function VideoCaption({ text }: { text: string }) {
  if (!text.trim()) return null;
  return (
    <p className="mx-auto mt-4 max-w-3xl text-center text-sm leading-relaxed text-white/65">
      {text}
    </p>
  );
}

export default function BlogPostVideosClient({
  items,
  title,
}: {
  items: PreparedBlogVideo[];
  title: string;
}) {
  return (
    <>
      <p className="mb-6 text-center text-[0.65rem] uppercase tracking-[0.28em] text-white/45">
        {items.length > 1 ? "Videos" : "Video"}
      </p>
      <div className="space-y-12">
        {items.map(({ video, thumbnailUrl, youtubeMode }) => {
          const caption = video.caption || title;

          if (video.provider === "youtube") {
            const youtubeId = extractYouTubeId(video.url);
            if (!youtubeId) return null;
            return (
              <div key={video.id} className="w-full overflow-x-hidden">
                <VideoEmbed
                  providerId={youtubeId}
                  posterKey={video.posterUrl || null}
                  thumbnailUrl={thumbnailUrl}
                  title={caption}
                  description={video.caption || title}
                  mode={youtubeMode || "embed"}
                />
              </div>
            );
          }

          if (video.provider === "instagram") {
            const permalink = extractInstagramPermalink(video.url);
            if (!permalink) return null;
            return (
              <div key={video.id} className="w-full overflow-x-hidden">
                <InstagramEmbed
                  permalink={permalink}
                  title={caption}
                  description={video.caption || title}
                  thumbnailUrl={thumbnailUrl}
                  posterUrl={video.posterUrl || null}
                />
              </div>
            );
          }

          if (!video.r2Key.trim()) return null;
          return (
            <div key={video.id}>
              <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-black image-guard-overlay" data-allow-save>
                <PublicInlineVideo
                  src={getPublicR2Url(video.r2Key)}
                  poster={thumbnailUrl || undefined}
                  alt={caption}
                  loop={false}
                  autoPlay={false}
                  videoClassName="aspect-video w-full object-cover"
                />
              </div>
              <VideoCaption text={video.caption} />
            </div>
          );
        })}
      </div>
    </>
  );
}
