"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { useReducedMotion } from "framer-motion";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/plugins/captions.css";

const BLUR_DATA =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iNyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iI2U4ZTllYSIvPjwvc3ZnPg==";

export type GalleryImageItem = {
  thumbUrl: string;
  fullUrl: string;
  alt?: string | null;
  order?: number;
  isHero?: boolean;
};

/** Supports legacy string[] (URL used for both thumb and full) or rich GalleryImageItem[] */
type GalleryImages = string[] | GalleryImageItem[];

function normalizeImages(images: GalleryImages): GalleryImageItem[] {
  if (images.length === 0) return [];
  const first = images[0];
  if (typeof first === "string") {
    return (images as string[]).map((url, i) => ({
      thumbUrl: url,
      fullUrl: url,
      alt: null,
      order: i,
      isHero: i === 0,
    }));
  }
  return (images as GalleryImageItem[]).map((img, i) => ({
    thumbUrl: img.thumbUrl,
    fullUrl: img.fullUrl,
    alt: img.alt ?? null,
    order: img.order ?? i,
    isHero: img.isHero ?? i === 0,
  }));
}

export default function GalleryLightbox({
  images,
  title,
}: {
  images: GalleryImages;
  title: string;
}) {
  const [index, setIndex] = useState(-1);
  const reduce = useReducedMotion();
  const items = useMemo(() => normalizeImages(images), [images]);

  const slides = useMemo(
    () =>
      items.map((item, i) => ({
        src: item.fullUrl,
        title: title,
        description: item.alt
          ? `${item.alt} · ${i + 1} of ${items.length}`
          : `${title} · ${i + 1} of ${items.length}`,
      })),
    [items, title]
  );

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item, i) => (
          <button
            key={`${item.thumbUrl}-${i}`}
            type="button"
            onClick={() => setIndex(i)}
            className="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-black/10 bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            aria-label={`Open ${title} image ${i + 1}`}
          >
            <Image
              src={item.thumbUrl}
              alt={item.alt ?? `${title} image ${i + 1}`}
              fill
              sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 100vw"
              placeholder="blur"
              blurDataURL={BLUR_DATA}
              className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02]"
            />
          </button>
        ))}
      </div>

      <Lightbox
        open={index >= 0}
        close={() => setIndex(-1)}
        index={index}
        slides={slides}
        plugins={[Captions, Fullscreen, Zoom]}
        captions={{ showToggle: true, descriptionTextAlign: "start" }}
        zoom={{ maxZoomPixelRatio: 2 }}
        carousel={{ finite: false }}
        animation={
          reduce
            ? { fade: 0, swipe: 0 }
            : { fade: 200, swipe: 200 }
        }
        styles={{ container: { backgroundColor: "rgba(0,0,0,0.94)" } }}
      />
    </>
  );
}
