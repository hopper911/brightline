"use client";

import { useState } from "react";
import Image from "next/image";
import { externalLinkProps } from "@/lib/external-link";

type BlogVideoCardProps = {
  title: string;
  thumbnailUrl?: string | null;
  /** Tried after primary thumb fails (e.g. cover still after IG proxy 404). */
  fallbackThumbnailUrl?: string | null;
  aspect: "video" | "reel";
  badge?: string;
  ctaLabel: string;
  href?: string;
  onPlay?: () => void;
  className?: string;
};

function PlayRing() {
  return (
    <div className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/70 bg-black/45 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur-sm transition duration-300 group-hover:scale-[1.04] group-hover:border-white group-hover:bg-black/55 sm:h-14 sm:w-14">
      <svg className="ml-0.5 h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M8 5v14l11-7z" />
      </svg>
    </div>
  );
}

function ThumbFallback() {
  return (
    <div
      className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.08),_transparent_60%),linear-gradient(180deg,#141820_0%,#0b0e12_100%)]"
      aria-hidden
    />
  );
}

/**
 * Dark cinematic video surface — instant thumbnail, no white third-party chrome.
 */
export default function BlogVideoCard({
  title,
  thumbnailUrl,
  fallbackThumbnailUrl,
  aspect,
  badge,
  ctaLabel,
  href,
  onPlay,
  className = "",
}: BlogVideoCardProps) {
  const [stage, setStage] = useState<"primary" | "fallback" | "none">(
    thumbnailUrl ? "primary" : fallbackThumbnailUrl ? "fallback" : "none"
  );
  const aspectClass = aspect === "reel" ? "aspect-[9/16]" : "aspect-video";
  const widthClass =
    aspect === "reel"
      ? "w-full max-w-[min(100%,280px)]"
      : "mx-auto w-full max-w-3xl";

  const activeSrc =
    stage === "primary"
      ? thumbnailUrl
      : stage === "fallback"
        ? fallbackThumbnailUrl
        : null;

  const inner = (
    <>
      <div
        className={`relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b0e12] image-guard-overlay ${aspectClass}`}
      >
        {activeSrc ? (
          <Image
            src={activeSrc}
            alt=""
            fill
            draggable={false}
            referrerPolicy="no-referrer"
            sizes={aspect === "reel" ? "280px" : "(min-width: 1024px) 768px, 100vw"}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            unoptimized
            onError={() => {
              if (stage === "primary" && fallbackThumbnailUrl) {
                setStage("fallback");
              } else {
                setStage("none");
              }
            }}
          />
        ) : (
          <ThumbFallback />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/30" />
        {badge ? (
          <span className="absolute left-4 top-4 text-[0.6rem] uppercase tracking-[0.28em] text-white/70">
            {badge}
          </span>
        ) : null}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <PlayRing />
          <span className="px-3 text-center text-[0.65rem] uppercase tracking-[0.28em] text-white/70">
            {ctaLabel}
          </span>
        </div>
      </div>
      <span className="sr-only">{title}</span>
    </>
  );

  const shellClass = `group block ${widthClass} ${className}`.trim();

  if (href) {
    return (
      <a
        href={href}
        {...externalLinkProps(href)}
        className={shellClass}
        aria-label={`${ctaLabel}: ${title}`}
      >
        {inner}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onPlay}
      className={`${shellClass} cursor-pointer text-left`}
      aria-label={`${ctaLabel}: ${title}`}
    >
      {inner}
    </button>
  );
}
