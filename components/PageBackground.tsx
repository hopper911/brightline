"use client";

import { useEffect, useState } from "react";
import { resolveFullBleedMediaUrl } from "@/lib/r2";
import { useSiteBackgroundCoexist } from "./SiteBackgroundContext";

export function mediaUrl(input?: string | null) {
  return resolveFullBleedMediaUrl(input);
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
const targetOpacity = "opacity-70";

type Props = {
  media?: string | null;
  poster?: string | null;
  className?: string;
  /** Visual strength of the media (default: visible through a light scrim). */
  mediaOpacityClass?: string;
  /** Dark base under media before load. */
  darkBaseClassName?: string;
  /**
   * When true, keep this page’s own background media even if a site-wide
   * background video is Live (default: inherit / suppress when site video is on).
   */
  forceLocalBackground?: boolean;
};

export default function PageBackground({
  media,
  poster,
  className = "",
  mediaOpacityClass = targetOpacity,
  darkBaseClassName = "bg-[var(--color-bg)]",
  forceLocalBackground = false,
}: Props) {
  const coexist = useSiteBackgroundCoexist();
  const [ready, setReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  const suppressMedia = !forceLocalBackground && coexist.suppressPageMedia;
  const src = suppressMedia ? "" : mediaUrl(media);
  const posterUrl = suppressMedia ? undefined : mediaUrl(poster) || undefined;

  useEffect(() => {
    setReady(false);
    setVideoFailed(false);
  }, [src, posterUrl]);

  // When site Live video wins, do not paint an opaque layer over it.
  if (suppressMedia) return null;

  if (!src) {
    return (
      <div
        className={`pointer-events-none fixed inset-0 z-[1] overflow-hidden ${className}`}
        aria-hidden
      >
        <div className={`absolute inset-0 ${darkBaseClassName}`} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_15%,rgba(255,255,255,0.1),transparent_28%),linear-gradient(180deg,rgba(7,9,11,0.35),rgba(7,9,11,0.72))]" />
      </div>
    );
  }

  const isVideo = isVideoUrl(src) && !videoFailed;
  const stillSrc =
    posterUrl || (!isVideoUrl(src) ? src : videoFailed ? posterUrl : undefined);

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[1] overflow-hidden ${className}`}
      aria-hidden
    >
      <div className={`absolute inset-0 ${darkBaseClassName}`} />
      {isVideo ? (
        <video
          key={src}
          src={src}
          poster={posterUrl}
          autoPlay
          muted
          defaultMuted
          loop
          playsInline
          preload="auto"
          onLoadedData={(e) => {
            e.currentTarget.muted = true;
            e.currentTarget.volume = 0;
            setReady(true);
          }}
          onError={() => {
            setVideoFailed(true);
            setReady(Boolean(posterUrl));
          }}
          className={`${mediaStyle} ${ready ? mediaOpacityClass : "opacity-0"}`}
        />
      ) : stillSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={stillSrc}
          src={stillSrc}
          alt=""
          draggable={false}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          onLoad={() => setReady(true)}
          onError={() => setReady(true)}
          className={`${mediaStyle} ${ready ? mediaOpacityClass : "opacity-0"}`}
        />
      ) : null}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_30%_15%,rgba(255,255,255,0.1),transparent_28%),linear-gradient(180deg,rgba(7,9,11,0.22),rgba(7,9,11,0.52))] transition-opacity duration-700"
        style={{ opacity: ready ? 1 : 0.75 }}
      />
    </div>
  );
}
