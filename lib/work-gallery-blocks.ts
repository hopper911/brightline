import { resolveFullBleedMediaUrl } from "@/lib/r2";
import {
  migrateLegacyGalleryBlocks,
  type GalleryBlock,
  type GalleryPoolItem,
} from "@/lib/gallery-blocks";

type MediaLike = {
  id: string;
  kind: string;
  keyFull?: string | null;
  keyThumb?: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
};

type MediaRow = {
  media: MediaLike;
};

/** Image pool for Work/Studio galleries (excludes hero when heroMediaId set). */
export function buildWorkGalleryPool(
  media: MediaRow[],
  heroMediaId?: string | null
): GalleryPoolItem[] {
  const rows = heroMediaId ? media.filter((row) => row.media.id !== heroMediaId) : media;
  return rows
    .map((row) => {
      const m = row.media;
      if (m.kind !== "IMAGE") return null;
      const src = resolveFullBleedMediaUrl(m.keyFull ?? m.keyThumb ?? "");
      if (!src || (!src.startsWith("http") && !src.startsWith("/"))) return null;
      return {
        id: m.id,
        src,
        alt: m.alt ?? "",
        width: m.width ?? null,
        height: m.height ?? null,
      } satisfies GalleryPoolItem;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

export function resolveWorkGalleryBlocks(
  galleryBlocks: unknown,
  galleryCarouselEnabled: boolean | null | undefined,
  pool: GalleryPoolItem[]
): GalleryBlock[] {
  return migrateLegacyGalleryBlocks({
    existingBlocks: galleryBlocks,
    carouselEnabled: Boolean(galleryCarouselEnabled),
    hasImages: pool.length > 0,
  });
}
