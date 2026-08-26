"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import ImageCarousel from "@/components/ImageCarousel";
import Reveal from "@/components/Reveal";
import {
  resolveGalleryBlockItems,
  type GalleryBlock,
  type GalleryPoolItem,
} from "@/lib/gallery-blocks";

const BLUR_DATA =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iNyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iI2U4ZTllYSIvPjwvc3ZnPg==";

type Props = {
  blocks: GalleryBlock[];
  pool: GalleryPoolItem[];
  /** When true, show a top-level Gallery heading once above all blocks. */
  showSectionHeading?: boolean;
  sectionHint?: string;
  className?: string;
};

function GridBlock({
  items,
  onOpen,
}: {
  items: GalleryPoolItem[];
  onOpen: (index: number) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
      {items.map((item, imageIndex) => (
        <button
          key={`${item.id}-${imageIndex}`}
          type="button"
          onClick={() => onOpen(imageIndex)}
          className={`relative block w-full cursor-zoom-in overflow-hidden rounded-2xl border border-white/10 bg-black text-left image-guard-overlay ${
            imageIndex % 5 === 0 ? "sm:col-span-2 aspect-[16/10]" : "aspect-[4/5]"
          }`}
          aria-label={`View ${item.alt || "image"} full size`}
        >
          <Image
            src={item.src}
            alt={item.alt || `Gallery image ${imageIndex + 1}`}
            fill
            draggable={false}
            sizes={
              imageIndex % 5 === 0
                ? "(min-width: 1280px) 1100px, 100vw"
                : "(min-width: 640px) calc(50vw - 40px), 100vw"
            }
            quality={90}
            placeholder="blur"
            blurDataURL={BLUR_DATA}
            className="object-cover image-fade"
          />
        </button>
      ))}
    </div>
  );
}

/**
 * Renders ordered carousel/grid blocks over a shared image pool, with one lightbox.
 */
export default function GalleryBlocks({
  blocks,
  pool,
  showSectionHeading = true,
  sectionHint = "Use arrows to browse. Click an image for full size.",
  className = "",
}: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxSlides, setLightboxSlides] = useState<{ src: string; alt: string }[]>([]);

  const visibleBlocks = useMemo(() => {
    return blocks
      .map((block) => ({
        block,
        items: resolveGalleryBlockItems(block, pool),
      }))
      .filter((row) => row.items.length > 0);
  }, [blocks, pool]);

  function openLightbox(items: GalleryPoolItem[], index: number) {
    setLightboxSlides(items.map((item) => ({ src: item.src, alt: item.alt })));
    setLightboxIndex(index);
    setLightboxOpen(true);
  }

  if (visibleBlocks.length === 0) return null;

  return (
    <div className={className}>
      {showSectionHeading ? (
        <Reveal>
          <h2 className="font-display text-2xl text-white">Gallery</h2>
          {sectionHint ? <p className="mt-2 text-sm text-white/70">{sectionHint}</p> : null}
        </Reveal>
      ) : null}

      <div className={showSectionHeading ? "mt-6 space-y-12" : "space-y-12"}>
        {visibleBlocks.map(({ block, items }) => (
          <Reveal key={block.id}>
            {block.title.trim() ? (
              <p className="mb-4 text-[0.65rem] uppercase tracking-[0.28em] text-white/45">
                {block.title.trim()}
              </p>
            ) : null}
            {block.type === "carousel" ? (
              <ImageCarousel
                slides={items.map((item) => ({
                  src: item.src,
                  alt: item.alt,
                  width: item.width,
                  height: item.height,
                }))}
                onSlideClick={(i) => openLightbox(items, i)}
              />
            ) : (
              <GridBlock items={items} onOpen={(i) => openLightbox(items, i)} />
            )}
          </Reveal>
        ))}
      </div>

      {lightboxSlides.length > 0 ? (
        <Lightbox
          plugins={[Zoom]}
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          index={lightboxIndex}
          slides={lightboxSlides}
          carousel={{ finite: lightboxSlides.length <= 1, imageFit: "contain" }}
          controller={{ closeOnBackdropClick: true, closeOnPullDown: true }}
          zoom={{
            maxZoomPixelRatio: 2,
            zoomInMultiplier: 2,
            doubleClickMaxStops: 2,
            scrollToZoom: true,
          }}
        />
      ) : null}
    </div>
  );
}
