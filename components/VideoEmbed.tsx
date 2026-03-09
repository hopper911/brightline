"use client";

import { useState } from "react";
import Image from "next/image";
import { getPublicR2Url } from "@/lib/r2";

type VideoEmbedProps = {
  providerId: string;
  posterKey?: string | null;
  title?: string;
};

const EMBED_URL =
  "https://www.youtube-nocookie.com/embed";
const PARAMS = "modestbranding=1&rel=0&playsinline=1";

export default function VideoEmbed({
  providerId,
  posterKey,
  title = "Video",
}: VideoEmbedProps) {
  const [loaded, setLoaded] = useState(false);

  const posterSrc = posterKey ? getPublicR2Url(posterKey) : null;
  const embedUrl = `${EMBED_URL}/${providerId}?${PARAMS}`;

  if (loaded) {
    return (
      <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full rounded-2xl border border-black/10 bg-black"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setLoaded(true)}
      className="group relative block w-full cursor-pointer overflow-hidden rounded-2xl border border-black/10 bg-black"
      style={{ aspectRatio: "16/9" }}
      aria-label={`Play video: ${title}`}
    >
      {posterSrc ? (
        <Image
          src={posterSrc}
          alt={title}
          fill
          sizes="(min-width: 1024px) 960px, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/80 text-white/90 transition-colors group-hover:border-white group-hover:bg-white/10">
            <svg
              className="ml-1 h-6 w-6"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
      {posterSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white bg-white/20 text-white">
            <svg
              className="ml-1 h-6 w-6"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
    </button>
  );
}
