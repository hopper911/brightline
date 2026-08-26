/**
 * Shared gallery layout blocks — carousel / grid over a shared image pool.
 * Used by Work, Studio, Blog, and Travel.
 */

export type GalleryBlockType = "carousel" | "grid";

export type GalleryBlock = {
  id: string;
  type: GalleryBlockType;
  /** Optional section heading above the block. */
  title: string;
  /**
   * Pool item ids (Work/Studio: MediaAsset id; Blog: gallery image id).
   * Empty = entire pool in pool order.
   */
  itemIds: string[];
};

export type GalleryPoolItem = {
  id: string;
  src: string;
  alt: string;
  width?: number | null;
  height?: number | null;
};

function newBlockId() {
  return `gb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function blankGalleryBlock(type: GalleryBlockType): GalleryBlock {
  return {
    id: newBlockId(),
    type,
    title: "",
    itemIds: [],
  };
}

export function cleanGalleryBlocks(value: unknown): GalleryBlock[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const type = row.type === "carousel" ? "carousel" : row.type === "grid" ? "grid" : null;
      if (!type) return null;
      const id =
        typeof row.id === "string" && row.id.trim() ? row.id.trim() : newBlockId();
      const title = typeof row.title === "string" ? row.title.trim() : "";
      const itemIds = Array.isArray(row.itemIds)
        ? row.itemIds
            .map((x) => (typeof x === "string" ? x.trim() : ""))
            .filter(Boolean)
        : [];
      return { id, type, title, itemIds } satisfies GalleryBlock;
    })
    .filter((b): b is GalleryBlock => Boolean(b));
}

/** Migrate legacy single carousel/grid flag into one block. */
export function migrateLegacyGalleryBlocks(options: {
  existingBlocks?: unknown;
  carouselEnabled?: boolean;
  hasImages?: boolean;
  /** When gallery section is explicitly off, return empty even if images exist. */
  galleryEnabled?: boolean;
}): GalleryBlock[] {
  const cleaned = cleanGalleryBlocks(options.existingBlocks);
  if (cleaned.length > 0) return cleaned;

  if (options.galleryEnabled === false) return [];
  if (!options.hasImages) return [];

  if (options.carouselEnabled) {
    return [blankGalleryBlock("carousel")];
  }
  return [blankGalleryBlock("grid")];
}

/** Resolve block itemIds against the pool (empty itemIds = all). */
export function resolveGalleryBlockItems(
  block: GalleryBlock,
  pool: GalleryPoolItem[]
): GalleryPoolItem[] {
  if (pool.length === 0) return [];
  if (block.itemIds.length === 0) return pool;
  const byId = new Map(pool.map((item) => [item.id, item]));
  return block.itemIds.map((id) => byId.get(id)).filter((item): item is GalleryPoolItem => Boolean(item));
}
