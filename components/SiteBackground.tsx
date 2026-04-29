"use client";

import { useState } from "react";
import type { SiteTheme } from "@/lib/site-theme";

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

function mediaUrl(input: string) {
  const value = input.trim();
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value) || value.startsWith("/")) return value;
  return `/api/media/public?key=${encodeURIComponent(value.replace(/^\/+/, ""))}`;
}

const mediaClass =
  "h-full w-full object-cover will-change-[opacity] transform-gpu [backface-visibility:hidden] transition-opacity duration-1000 ease-out motion-reduce:transition-none";

export default function SiteBackground({ theme }: { theme: SiteTheme }) {
  const [ready, setReady] = useState(false);

  if (!theme.backgroundMediaEnabled || !theme.backgroundMediaUrl) return null;
  const src = mediaUrl(theme.backgroundMediaUrl);
  const poster = mediaUrl(theme.backgroundPosterUrl);
  if (!src) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[var(--color-bg)]" />
      {isVideoUrl(src) ? (
        <video
          key={src}
          src={src}
          poster={poster || undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedData={() => setReady(true)}
          onError={() => setReady(true)}
          className={`${mediaClass} ${ready ? "opacity-30" : "opacity-0"}`}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          loading="eager"
          decoding="async"
          fetchPriority="high"
          onLoad={() => setReady(true)}
          onError={() => setReady(true)}
          className={`${mediaClass} ${ready ? "opacity-30" : "opacity-0"}`}
        />
      )}
      <div
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,9,11,0.55),rgba(7,9,11,0.88))] transition-opacity duration-700"
        style={{ opacity: ready ? 1 : 0.82 }}
      />
    </div>
  );
}
