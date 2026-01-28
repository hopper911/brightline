"use client";

import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

export default function GalleryLightbox({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [index, setIndex] = useState(-1);

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
            <img
              src={image}
              alt={`${title} image ${i + 1}`}
              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      <Lightbox
        open={index >= 0}
        close={() => setIndex(-1)}
        index={index}
        slides={images.map((src) => ({ src }))}
      />
    </>
  );
}
