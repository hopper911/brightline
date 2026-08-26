"use client";

import { useState } from "react";
import BlogVideoCard from "@/components/blog/BlogVideoCard";
import { youtubeWatchUrl } from "@/lib/blog-post-model";
import { youtubeThumbnailUrl } from "@/lib/blog-video-thumbs-client";
import { getPublicR2Url } from "@/lib/r2";

type VideoEmbedProps = {
  providerId: string;
  posterKey?: string | null;
  thumbnailUrl?: string | null;
  title?: string;
  description?: string;
  /** Hint only — play always stays on-site in the frame. */
  mode?: "embed" | "external";
};

const EMBED_URL = "https://www.youtube-nocookie.com/embed";
const PARAMS = "modestbranding=1&rel=0&playsinline=1&autoplay=1";

function YouTubeDescription({
  label,
  copy,
  watchUrl,
  note,
}: {
  label: string;
  copy: string;
  watchUrl: string;
  note?: string | null;
}) {
  return (
    <div className="mt-6 border-t border-white/10 pt-6">
      <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/45">{label}</p>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-[0.95rem]">
        {copy}
      </p>
      {note ? (
        <p className="mt-3 text-xs leading-relaxed text-white/40">{note}</p>
      ) : null}
      <a
        href={watchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex min-h-[44px] items-center text-[0.65rem] uppercase tracking-[0.22em] text-white/55 transition hover:text-white/85"
      >
        Open on YouTube →
      </a>
    </div>
  );
}

/**
 * Dark YouTube surface — Play loads the player in-frame (never navigates away).
 */
export default function VideoEmbed({
  providerId,
  posterKey,
  thumbnailUrl,
  title = "Video",
  description,
  mode = "embed",
}: VideoEmbedProps) {
  const [loaded, setLoaded] = useState(false);
  const safeId = /^[a-zA-Z0-9_-]{11}$/.test(providerId.trim())
    ? providerId.trim()
    : null;

  if (!safeId) return null;

  const posterFromKey = posterKey ? getPublicR2Url(posterKey) || posterKey : null;
  const resolvedThumb = thumbnailUrl || posterFromKey || youtubeThumbnailUrl(safeId, "hq");
  const watchUrl = youtubeWatchUrl(safeId);
  const embedUrl = `${EMBED_URL}/${safeId}?${PARAMS}`;
  const copy = (description || "").trim() || title;

  return (
    <div className="mx-auto w-full max-w-3xl">
      {loaded ? (
        <div
          className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black image-guard-overlay"
          style={{ aspectRatio: "16/9" }}
        >
          <iframe
            src={embedUrl}
            title={title}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full"
          />
        </div>
      ) : (
        <BlogVideoCard
          title={title}
          thumbnailUrl={resolvedThumb}
          aspect="video"
          badge="YouTube"
          ctaLabel="Play video"
          onPlay={() => setLoaded(true)}
        />
      )}
      <YouTubeDescription
        label="YouTube"
        copy={copy}
        watchUrl={watchUrl}
        note={
          mode === "external"
            ? "If the player can’t start, embedding may be off in YouTube Studio — or upload an MP4 to R2 for guaranteed on-site playback."
            : null
        }
      />
    </div>
  );
}
