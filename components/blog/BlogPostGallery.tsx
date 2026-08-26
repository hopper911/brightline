"use client";

import GalleryBlocks from "@/components/gallery/GalleryBlocks";
import {
  migrateLegacyGalleryBlocks,
  type GalleryBlock,
} from "@/lib/gallery-blocks";
import type { BlogGalleryImage } from "@/lib/blog-post-model";

type Props = {
  title: string;
  images: BlogGalleryImage[];
  blocks?: GalleryBlock[];
  /** Legacy: when blocks empty, use carousel vs grid from this flag. */
  carouselEnabled?: boolean;
  className?: string;
};

/**
 * Blog / Travel gallery — ordered carousel/grid blocks over the shared image pool.
 */
export default function BlogPostGallery({
  title,
  images,
  blocks,
  carouselEnabled = false,
  className = "",
}: Props) {
  const pool = images
    .filter((image) => image.url.trim())
    .map((image, index) => ({
      id: image.id || `img_${index}`,
      src: image.url,
      alt: image.alt || `${title} image ${index + 1}`,
    }));

  const resolvedBlocks = migrateLegacyGalleryBlocks({
    existingBlocks: blocks,
    carouselEnabled,
    hasImages: pool.length > 0,
    galleryEnabled: true,
  });

  if (pool.length === 0 || resolvedBlocks.length === 0) return null;

  return (
    <GalleryBlocks
      blocks={resolvedBlocks}
      pool={pool}
      showSectionHeading={false}
      className={className}
    />
  );
}
