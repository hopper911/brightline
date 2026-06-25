"use client";

import { useState } from "react";
import { getPublicR2Url } from "@/lib/r2";

export function mediaUrl(input?: string | null) {
  const value = input?.trim();
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value) || value.startsWith("/")) return value;
  return getPublicR2Url(value);
}

function isVideoUrl(url: string) {
  const decoded = decodeURIComponent(url);
  try {
    const parsed = new URL(decoded, "https://brightline.local");
    const key = parsed.searchParams.get("key") ?? "";
    return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(key || parsed.pathname);
  } catch {
    return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(decoded);
  }
}

const mediaStyle =
  "h-full w-full object-cover will-change-[opacity] transform-gpu [backface-visibility:hidden] transition-opacity duration-1000 ease-out motion-reduce:transition-none";
const targetOpacity = "opacity-45";

type Props = {
  media?: string | null;
  poster?: string | null;
  className?: string;
  /** Visual strength of the media (default matches previous site). */
  mediaOpacityClass?: string;
  /** Dark scrim; keeps layout stable and avoids a harsh flash before media loads. */
  darkBaseClassName?: string;
};

export default function PageBackground({
  media,
  poster,
  className = "",
  mediaOpacityClass = targetOpacity,
  darkBaseClassName = "bg-[var(--color-bg)]",
}: Props) {
  const src = mediaUrl(media);
  const [ready, setReady] = useState(false);

  if (!src) {
    return (
      <div
        className={`pointer-events-none fixed inset-0 z-[1] overflow-hidden ${className}`}
        aria-hidden
      >
        <div className={`absolute inset-0 ${darkBaseClassName}`} />
        <div className="page-bg-vignette transition-opacity duration-700" style={{ opacity: 0.88 }} />
        <div className="page-bg-blend-bottom" />
      </div>
    );
  }

  const posterUrl = mediaUrl(poster) || undefined;

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[1] overflow-hidden ${className}`}
      aria-hidden
    >
      <div className={`absolute inset-0 ${darkBaseClassName}`} />
      {isVideoUrl(src) ? (
        <video
          key={src}
          src={src}
          poster={posterUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedData={() => setReady(true)}
          onError={() => setReady(true)}
          className={`${mediaStyle} ${ready ? mediaOpacityClass : "opacity-0"}`}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          draggable={false}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          onLoad={() => setReady(true)}
          onError={() => setReady(true)}
          className={`${mediaStyle} ${ready ? mediaOpacityClass : "opacity-0"}`}
        />
      )}
      <div
        className="page-bg-vignette transition-opacity duration-700"
        style={{ opacity: ready ? 1 : 0.88 }}
      />
      <div className="page-bg-blend-bottom" />
    </div>
  );
}
