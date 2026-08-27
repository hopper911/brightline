"use client";

import { useEffect, useRef, useState } from "react";

type PublicInlineVideoProps = {
  src: string;
  poster?: string;
  alt: string;
  loop?: boolean;
  autoPlay?: boolean;
  className?: string;
  videoClassName?: string;
  /** Hide native controls below md (768px) — avoids iOS scrubber / PiP chrome on case-study embeds. */
  hideControlsMobile?: boolean;
};

/**
 * Inline MP4 for public case studies. On mobile, native controls are hidden;
 * autoplay muted loop runs like a cinematic clip. Tap to pause; tap again to play.
 */
export default function PublicInlineVideo({
  src,
  poster,
  alt,
  loop = true,
  autoPlay = true,
  className = "",
  videoClassName = "h-full w-full object-cover",
  hideControlsMobile = true,
}: PublicInlineVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [paused, setPaused] = useState(!autoPlay);

  useEffect(() => {
    const mobileMq = window.matchMedia("(max-width: 767px)");
    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setIsMobile(mobileMq.matches);
      setReducedMotion(motionMq.matches);
    };
    sync();
    mobileMq.addEventListener("change", sync);
    motionMq.addEventListener("change", sync);
    return () => {
      mobileMq.removeEventListener("change", sync);
      motionMq.removeEventListener("change", sync);
    };
  }, []);

  const hideNativeControls = hideControlsMobile && isMobile;
  const shouldAutoPlay = autoPlay && !reducedMotion && !paused;

  function togglePlayback() {
    if (!hideNativeControls) return;
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
      setPaused(false);
    } else {
      el.pause();
      setPaused(true);
    }
  }

  return (
    <div className={`relative ${className}`.trim()} data-allow-save>
      <video
        ref={videoRef}
        key={src}
        src={src}
        poster={poster}
        autoPlay={shouldAutoPlay}
        muted
        loop={loop && !paused}
        playsInline
        controls={!hideNativeControls}
        controlsList={hideNativeControls ? undefined : "nodownload noplaybackrate noremoteplayback"}
        disablePictureInPicture={hideNativeControls}
        disableRemotePlayback={hideNativeControls}
        preload="metadata"
        draggable={false}
        className={videoClassName}
        aria-label={alt}
        onPlay={() => setPaused(false)}
        onPause={() => {
          if (hideNativeControls) setPaused(true);
        }}
      >
        Your browser does not support the video tag.
      </video>
      {hideNativeControls ? (
        <button
          type="button"
          className="absolute inset-0 z-[3] m-0 cursor-pointer border-0 bg-transparent p-0"
          onClick={togglePlayback}
          aria-label={paused ? `Play ${alt}` : `Pause ${alt}`}
        >
          {paused ? (
            <span
              className="absolute left-1/2 top-1/2 flex h-12 w-12 min-h-[44px] min-w-[44px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm"
              aria-hidden
            >
              <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5 fill-current" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          ) : null}
        </button>
      ) : null}
    </div>
  );
}
