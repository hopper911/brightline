"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ResolvedSiteBackgroundMedia } from "@/lib/site-background-videos";
import { SiteBackgroundCoexistContext, type SiteBackgroundCoexistValue } from "./SiteBackgroundContext";

function isVideoMediaUrl(url: string) {
  const decoded = decodeURIComponent(url);
  try {
    const parsed = new URL(decoded, "https://brightline.local");
    const key = parsed.searchParams.get("key") ?? "";
    return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(key || parsed.pathname);
  } catch {
    return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(decoded);
  }
}

const mediaClass =
  "h-full w-full object-cover will-change-[opacity] transform-gpu [backface-visibility:hidden] transition-opacity duration-1000 ease-out motion-reduce:transition-none";

/** Always silent + looping — no unmute/pause UI. */
function SiteBackgroundMedia({ media }: { media: ResolvedSiteBackgroundMedia }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const src = media.videoUrl.trim();
  const poster = media.posterUrl.trim();
  const isVideo = src ? isVideoMediaUrl(src) : false;
  const useVideo = isVideo && !reducedMotion && !videoFailed;
  const stillSrc = poster || (!isVideo ? src : videoFailed ? poster : "");
  // Keep video visible through a light scrim (not a black field).
  const opacityClass = media.cinematic ? "opacity-75" : "opacity-65";
  const scrim = media.cinematic
    ? "bg-[linear-gradient(180deg,rgba(7,9,11,0.18),rgba(7,9,11,0.48))]"
    : "bg-[linear-gradient(180deg,rgba(7,9,11,0.28),rgba(7,9,11,0.58))]";

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setReady(false);
    setVideoFailed(false);
  }, [src, poster]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !useVideo) return;
    el.muted = true;
    el.defaultMuted = true;
    el.setAttribute("muted", "");
    el.volume = 0;
    el.loop = true;
    el.playsInline = true;

    const tryPlay = () => {
      el.muted = true;
      el.volume = 0;
      void el.play().then(() => setReady(true)).catch(() => undefined);
    };

    const onPlaying = () => setReady(true);

    tryPlay();
    el.addEventListener("canplay", tryPlay);
    el.addEventListener("loadeddata", tryPlay);
    el.addEventListener("playing", onPlaying);
    el.addEventListener("pause", tryPlay);
    const onVis = () => {
      if (document.visibilityState === "visible") tryPlay();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      el.removeEventListener("canplay", tryPlay);
      el.removeEventListener("loadeddata", tryPlay);
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("pause", tryPlay);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [useVideo, src]);

  if (!media.enabled || !src) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[var(--color-bg)]" />
      {stillSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`still-${stillSrc}`}
          src={stillSrc}
          alt=""
          draggable={false}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          className={`${mediaClass} ${ready && useVideo ? "opacity-0" : ready ? opacityClass : "opacity-0"}`}
        />
      ) : null}
      {useVideo ? (
        <video
          ref={videoRef}
          key={src}
          src={src}
          poster={poster || undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onPlaying={() => setReady(true)}
          onError={() => {
            const code = videoRef.current?.error?.code;
            if (code === 1) return;
            setVideoFailed(true);
            setReady(Boolean(poster));
          }}
          className={`${mediaClass} ${ready ? opacityClass : "opacity-0"}`}
        />
      ) : null}
      <div
        className={`absolute inset-0 ${scrim} transition-opacity duration-700`}
        style={{ opacity: ready ? 1 : 0.7 }}
      />
    </div>
  );
}

export default function SiteBackgroundLayer({
  media,
  suppressPageMedia,
  children,
}: {
  media: ResolvedSiteBackgroundMedia;
  suppressPageMedia: boolean;
  children: ReactNode;
}) {
  const src = media.videoUrl.trim();
  const hasVideo = Boolean(media.enabled && src && isVideoMediaUrl(src));

  const coexist = useMemo<SiteBackgroundCoexistValue>(
    () => ({
      siteVideoActive: hasVideo,
      suppressPageMedia: hasVideo && suppressPageMedia,
    }),
    [hasVideo, suppressPageMedia]
  );

  return (
    <SiteBackgroundCoexistContext.Provider value={coexist}>
      <SiteBackgroundMedia media={media} />
      {children}
    </SiteBackgroundCoexistContext.Provider>
  );
}
