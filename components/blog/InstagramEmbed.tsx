"use client";

import { useState } from "react";
import BlogVideoCard from "@/components/blog/BlogVideoCard";
import { instagramEmbedUrl } from "@/lib/blog-post-model";
import { getPublicR2Url } from "@/lib/r2";

type InstagramEmbedProps = {
  permalink: string;
  title?: string;
  description?: string;
  /** Instant thumbnail (proxied OG, admin poster, or R2). */
  thumbnailUrl?: string | null;
  posterUrl?: string | null;
};

/**
 * Instagram’s embed always ships white chrome (cross-origin — unstyleable).
 * We crop/scale into a dark 9:16 stage so only the media shows inside our frame.
 */
function InstagramDarkStage({ src, title }: { src: string; title: string }) {
  return (
    <div className="relative mx-auto w-full max-w-[min(100%,280px)] md:mx-0">
      <div className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] image-guard-overlay">
        {/*
          Instagram embed canvas is ~540px with white header/footer.
          Oversize + offset clips chrome; dark masks catch residual edges.
        */}
        <iframe
          src={src}
          title={title}
            allow="autoplay; encrypted-media; picture-in-picture; web-share"
          allowFullScreen
          loading="eager"
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute left-1/2 top-0 border-0 bg-black"
          style={{
            width: 540,
            height: 980,
            marginLeft: -270,
            top: -72,
            transform: "scale(0.72)",
            transformOrigin: "top center",
          }}
        />

        {/* Soft charcoal masks — hide leftover white without covering mid-frame video */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-11 bg-gradient-to-b from-black via-black/85 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-16 bg-gradient-to-t from-black via-black/90 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-4 bg-gradient-to-r from-black to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-4 bg-gradient-to-l from-black to-transparent"
          aria-hidden
        />

        {/* Hairline frame to match BlogVideoCard */}
        <div
          className="pointer-events-none absolute inset-0 z-[2] rounded-2xl ring-1 ring-inset ring-white/10"
          aria-hidden
        />
        <span className="pointer-events-none absolute left-4 top-4 z-[2] text-[0.6rem] uppercase tracking-[0.28em] text-white/70">
          Instagram
        </span>
      </div>
    </div>
  );
}

/**
 * Dark BRIGHTLINE Instagram card — reel left, description right on md+.
 * Play crops the official embed into our cinematic frame (no white card chrome).
 */
export default function InstagramEmbed({
  permalink,
  title = "Instagram video",
  description,
  thumbnailUrl,
  posterUrl,
}: InstagramEmbedProps) {
  const [playing, setPlaying] = useState(false);
  const poster =
    thumbnailUrl ||
    (posterUrl ? getPublicR2Url(posterUrl) || posterUrl : null) ||
    null;
  const copy = (description || "").trim();
  const embedSrc = instagramEmbedUrl(permalink);

  return (
    <div className="mx-auto grid w-full max-w-4xl grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-10">
      <div className="flex justify-center md:justify-end">
        {playing && embedSrc ? (
          <InstagramDarkStage src={embedSrc} title={title} />
        ) : (
          <BlogVideoCard
            title={title}
            thumbnailUrl={poster}
            aspect="reel"
            badge="Instagram"
            ctaLabel="Play video"
            onPlay={() => setPlaying(true)}
            className="mx-auto md:mx-0"
          />
        )}
      </div>

      <div className="min-w-0 border-t border-white/10 pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
        <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/45">Instagram</p>
        <p className="mt-3 text-sm leading-relaxed text-white/75 sm:text-[0.95rem]">
          {copy || title}
        </p>
        <a
          href={permalink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex min-h-[44px] items-center text-[0.65rem] uppercase tracking-[0.22em] text-white/55 transition hover:text-white/85"
        >
          Open on Instagram →
        </a>
      </div>
    </div>
  );
}
