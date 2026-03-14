"use client";

import { useState } from "react";
import Image from "next/image";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Reveal from "@/components/Reveal";
import VideoEmbed from "@/components/VideoEmbed";
import { getPublicR2Url } from "@/lib/r2";

type MediaAsset = {
  id: string;
  kind: string;
  width?: number | null;
  height?: number | null;
  keyFull?: string | null;
  keyThumb?: string | null;
  alt?: string | null;
  providerId?: string | null;
  posterKey?: string | null;
};

type ProjectMediaItem = {
  mediaId: string;
  sortOrder: number;
  media: MediaAsset;
};

function getGridUrl(keyFull?: string | null, keyThumb?: string | null): string {
  return getPublicR2Url(keyThumb ?? keyFull ?? "");
}

function getAspectRatioStyle(
  width?: number | null,
  height?: number | null
): React.CSSProperties {
  if (width && height && width > 0 && height > 0) {
    return { aspectRatio: `${width} / ${height}` };
  }
  return { aspectRatio: "4 / 3" };
}

type WorkProjectGalleryProps = {
  projectTitle: string;
  projectLocation?: string | null;
  media: ProjectMediaItem[];
  heroMediaId?: string | null;
};

const BLUR_DATA =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iNyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iI2U4ZTllYSIvPjwvc3ZnPg==";

function R2VideoBlock({
  keyFull,
  posterKey,
  alt,
  width,
  height,
}: {
  keyFull: string;
  posterKey?: string | null;
  alt: string;
  width?: number | null;
  height?: number | null;
}) {
  const src = getPublicR2Url(keyFull);
  const poster = posterKey ? getPublicR2Url(posterKey) : undefined;
  const style = width && height && width > 0 && height > 0
    ? { aspectRatio: `${width} / ${height}` }
    : { aspectRatio: "16 / 9" };
  if (!src || (!src.startsWith("http") && !src.startsWith("/"))) return null;
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black"
      style={style}
    >
      <video
        src={src}
        poster={poster}
        controls
        playsInline
        className="h-full w-full object-cover"
        aria-label={alt}
      />
    </div>
  );
}

function getFallbackAlt(
  projectTitle: string,
  projectLocation: string | null | undefined,
  imageIndex: number
): string {
  const base = projectLocation
    ? `${projectTitle} in ${projectLocation}`
    : projectTitle;
  return `${base} — image ${imageIndex}`;
}

export default function WorkProjectGallery({
  projectTitle,
  projectLocation,
  media,
  heroMediaId,
}: WorkProjectGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const galleryMedia = heroMediaId
    ? media.filter((item) => item.media.id !== heroMediaId)
    : media;

  const imageItems = galleryMedia.filter((item) => {
    if (item.media.kind !== "IMAGE" || (!item.media.keyFull && !item.media.keyThumb)) {
      return false;
    }
    const url = getGridUrl(item.media.keyFull, item.media.keyThumb);
    return !!url && (url.startsWith("http") || url.startsWith("/"));
  });

  const slides = imageItems
    .map((item, idx) => {
      const key = item.media.keyFull ?? item.media.keyThumb ?? "";
      const src = getPublicR2Url(key);
      if (!src || (!src.startsWith("http") && !src.startsWith("/"))) return null;
      const fallbackAlt = getFallbackAlt(projectTitle, projectLocation, idx + 1);
      return { src, alt: item.media.alt ?? fallbackAlt };
    })
    .filter((s): s is { src: string; alt: string } => s !== null);

  return (
    <>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {galleryMedia.map(({ media: m, sortOrder }, galleryIdx) => {
          const imageIdx = galleryMedia
            .slice(0, galleryIdx + 1)
            .filter((x) => x.media.kind === "IMAGE").length - 1;
          const fallbackAlt =
            m.kind === "IMAGE"
              ? getFallbackAlt(
                  projectTitle,
                  projectLocation,
                  imageIdx >= 0 ? imageIdx + 1 : 1
                )
              : projectTitle;
          const altText = m.alt ?? fallbackAlt;
          return m.kind === "VIDEO" && m.providerId ? (
            <Reveal key={`${m.id}-${sortOrder}`}>
              <VideoEmbed
                providerId={m.providerId}
                posterKey={m.posterKey ?? undefined}
                title={altText}
              />
            </Reveal>
          ) : m.kind === "VIDEO" && m.keyFull ? (
            <Reveal key={`${m.id}-${sortOrder}`}>
              <R2VideoBlock
                keyFull={m.keyFull}
                posterKey={m.keyThumb ?? m.posterKey ?? undefined}
                alt={altText}
                width={m.width}
                height={m.height}
              />
            </Reveal>
          ) : m.kind === "IMAGE" && (m.keyFull || m.keyThumb) ? (
            (() => {
              const imgSrc = getGridUrl(m.keyFull, m.keyThumb);
              const isValidSrc =
                imgSrc && (imgSrc.startsWith("http") || imgSrc.startsWith("/"));
              if (!isValidSrc) return null;
              return (
                <Reveal key={`${m.id}-${sortOrder}`}>
                  <button
                    type="button"
                    onClick={() => {
                      const idx = imageItems.findIndex(
                        (item) => item.media.id === m.id
                      );
                      if (idx >= 0) {
                        setLightboxIndex(idx);
                        setLightboxOpen(true);
                      }
                    }}
                    className="block w-full cursor-zoom-in text-left"
                    aria-label={`View ${altText} in lightbox`}
                  >
                    <div
                      className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black"
                      style={getAspectRatioStyle(m.width, m.height)}
                    >
                      <Image
                        src={imgSrc}
                        alt={altText}
                        fill
                        sizes="(min-width: 1280px) 576px, (min-width: 640px) calc(50vw - 40px), 100vw"
                        placeholder="blur"
                        blurDataURL={BLUR_DATA}
                        className="object-cover image-fade"
                      />
                    </div>
                  </button>
                </Reveal>
              );
            })()
          ) : null;
        })}
      </div>

      {slides.length > 0 && (
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          index={lightboxIndex}
          slides={slides}
          carousel={{ imageFit: "contain" }}
        />
      )}
    </>
  );
}
