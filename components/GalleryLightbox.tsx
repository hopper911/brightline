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

export default function GalleryLightbox({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [index, setIndex] = useState(-1);
  const reduce = useReducedMotion();
  const slides = useMemo(
    () =>
      images.map((src, i) => ({
        src,
        title: title,
        description: `${title} · ${i + 1} of ${images.length}`,
      })),
    [images, title]
  );

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {images.map((image, i) => (
          <button
            key={image}
            type="button"
            onClick={() => setIndex(i)}
            className="group relative h-[200px] overflow-hidden rounded-[22px] border border-black/10 bg-white/80"
            aria-label={`Open ${title} image ${i + 1}`}
          >
            <Image
              src={image}
              alt={`${title} image ${i + 1}`}
              fill
              sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 100vw"
              placeholder="blur"
              blurDataURL={BLUR_DATA}
              className="object-cover transition motion-slow motion-ease group-hover:scale-105 motion-reduce:transition-none motion-reduce:transform-none"
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
            : { fade: 240, swipe: 240 }
        }
      />
    </>
  );
}
