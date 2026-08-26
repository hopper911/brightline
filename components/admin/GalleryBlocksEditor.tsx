"use client";

import {
  blankGalleryBlock,
  type GalleryBlock,
  type GalleryPoolItem,
} from "@/lib/gallery-blocks";

type Props = {
  blocks: GalleryBlock[];
  pool: GalleryPoolItem[];
  onChange: (blocks: GalleryBlock[]) => void;
  /** Light admin chrome vs dark blog admin. */
  tone?: "light" | "dark";
};

/**
 * Admin editor: ordered carousel/grid blocks over a shared image pool.
 */
export default function GalleryBlocksEditor({
  blocks,
  pool,
  onChange,
  tone = "light",
}: Props) {
  const border = tone === "light" ? "border-black/10" : "border-white/10";
  const panel = tone === "light" ? "bg-black/[0.02]" : "bg-black/30";
  const label = tone === "light" ? "text-black/70" : "text-white/70";
  const muted = tone === "light" ? "text-black/50" : "text-white/45";
  const input =
    tone === "light"
      ? "rounded border border-black/15 bg-white px-2 py-1.5 text-sm text-black"
      : "rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white";

  function updateBlock(id: string, patch: Partial<GalleryBlock>) {
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function moveBlock(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[j]] = [next[j]!, next[index]!];
    onChange(next);
  }

  function removeBlock(id: string) {
    onChange(blocks.filter((b) => b.id !== id));
  }

  function toggleItem(block: GalleryBlock, itemId: string) {
    const usingAll = block.itemIds.length === 0;
    // Switching from "all" → start with full pool then toggle
    let ids = usingAll ? pool.map((p) => p.id) : [...block.itemIds];
    if (ids.includes(itemId)) {
      ids = ids.filter((x) => x !== itemId);
    } else {
      ids.push(itemId);
    }
    // If selection matches full pool order, store empty (= all)
    const allIds = pool.map((p) => p.id);
    const isAll =
      ids.length === allIds.length && ids.every((id, i) => id === allIds[i]);
    updateBlock(block.id, { itemIds: isAll ? [] : ids });
  }

  function setUseAll(blockId: string) {
    updateBlock(blockId, { itemIds: [] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={`text-sm font-medium ${label}`}>Gallery layout</p>
          <p className={`mt-0.5 text-xs ${muted}`}>
            Add carousels and grids over the same image pool. Empty selection = all images in pool
            order.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-ghost text-xs"
            onClick={() => onChange([...blocks, blankGalleryBlock("carousel")])}
          >
            + Carousel
          </button>
          <button
            type="button"
            className="btn btn-ghost text-xs"
            onClick={() => onChange([...blocks, blankGalleryBlock("grid")])}
          >
            + Grid
          </button>
        </div>
      </div>

      {blocks.length === 0 ? (
        <p className={`rounded-lg border ${border} ${panel} px-3 py-3 text-xs ${muted}`}>
          No layout blocks yet. Add a carousel and/or grid — or leave empty to hide the gallery
          section until you add one.
        </p>
      ) : null}

      <ul className="space-y-3">
        {blocks.map((block, index) => {
          const usingAll = block.itemIds.length === 0;
          return (
            <li
              key={block.id}
              className={`rounded-xl border ${border} ${panel} p-4 space-y-3`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className={input}
                    value={block.type}
                    onChange={(e) =>
                      updateBlock(block.id, {
                        type: e.target.value === "carousel" ? "carousel" : "grid",
                      })
                    }
                  >
                    <option value="carousel">Carousel</option>
                    <option value="grid">Grid gallery</option>
                  </select>
                  <input
                    className={`${input} min-w-[10rem]`}
                    placeholder="Optional title"
                    value={block.title}
                    onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="btn btn-ghost text-xs"
                    disabled={index === 0}
                    onClick={() => moveBlock(index, -1)}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost text-xs"
                    disabled={index === blocks.length - 1}
                    onClick={() => moveBlock(index, 1)}
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost text-xs text-red-600"
                    onClick={() => removeBlock(block.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={`rounded-lg border px-2.5 py-1 text-xs ${
                    usingAll
                      ? tone === "light"
                        ? "border-black/30 bg-black text-white"
                        : "border-white/40 bg-white/15 text-white"
                      : border + " " + muted
                  }`}
                  onClick={() => setUseAll(block.id)}
                >
                  All images ({pool.length})
                </button>
                <span className={`text-xs ${muted}`}>
                  {usingAll
                    ? "Using full pool order"
                    : `${block.itemIds.length} selected`}
                </span>
              </div>

              {pool.length === 0 ? (
                <p className={`text-xs ${muted}`}>Add images to the pool first.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {pool.map((item, i) => {
                    const selected = usingAll || block.itemIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        title={item.alt || item.id}
                        onClick={() => toggleItem(block, item.id)}
                        className={`relative h-14 w-14 overflow-hidden rounded-lg border ${
                          selected
                            ? tone === "light"
                              ? "border-black ring-1 ring-black"
                              : "border-white ring-1 ring-white/60"
                            : "border-transparent opacity-45"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.src}
                          alt=""
                          className="h-full w-full object-cover"
                          draggable={false}
                        />
                        <span className="absolute bottom-0 left-0 right-0 bg-black/55 text-center text-[0.55rem] text-white">
                          {i + 1}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
