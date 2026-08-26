"use client";

import GalleryBlocksEditor from "@/components/admin/GalleryBlocksEditor";
import type { GalleryPoolItem } from "@/lib/gallery-blocks";
import {
  STORY_BLOCK_LABELS,
  STORY_BLOCK_TYPES,
  blankStoryBlock,
  blankStoryChapter,
  createFullCaseStudyChapter,
  type StoryBlock,
  type StoryBlockType,
  type StoryChapter,
} from "@/lib/story-chapters";

type Props = {
  chapters: StoryChapter[];
  pool: GalleryPoolItem[];
  onChange: (chapters: StoryChapter[]) => void;
  /** Convert legacy page content into chapter 1. */
  onConvertLegacy?: () => void;
  tone?: "light" | "dark";
  /** When true, hero picker uses media ids from pool. */
  heroUsesPoolIds?: boolean;
};

/**
 * Admin: multi-story chapters with pick-and-choose blocks + full case-study template.
 */
export default function StoryChaptersEditor({
  chapters,
  pool,
  onChange,
  onConvertLegacy,
  tone = "light",
  heroUsesPoolIds = true,
}: Props) {
  const border = tone === "light" ? "border-black/10" : "border-white/10";
  const panel = tone === "light" ? "bg-black/[0.02]" : "bg-black/30";
  const label = tone === "light" ? "text-black/70" : "text-white/70";
  const muted = tone === "light" ? "text-black/50" : "text-white/45";
  const input =
    tone === "light"
      ? "w-full rounded border border-black/15 bg-white px-3 py-2 text-sm text-black"
      : "w-full rounded border border-white/15 bg-black/40 px-3 py-2 text-sm text-white";

  function updateChapter(id: string, patch: Partial<StoryChapter>) {
    onChange(chapters.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function updateBlock(chapterId: string, blockId: string, patch: Partial<StoryBlock>) {
    onChange(
      chapters.map((c) =>
        c.id !== chapterId
          ? c
          : {
              ...c,
              blocks: c.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
            }
      )
    );
  }

  function moveChapter(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= chapters.length) return;
    const next = [...chapters];
    [next[index], next[j]] = [next[j]!, next[index]!];
    onChange(next);
  }

  function moveBlock(chapterId: string, index: number, dir: -1 | 1) {
    const chapter = chapters.find((c) => c.id === chapterId);
    if (!chapter) return;
    const j = index + dir;
    if (j < 0 || j >= chapter.blocks.length) return;
    const blocks = [...chapter.blocks];
    [blocks[index], blocks[j]] = [blocks[j]!, blocks[index]!];
    updateChapter(chapterId, { blocks });
  }

  function addBlock(chapterId: string, type: StoryBlockType) {
    const chapter = chapters.find((c) => c.id === chapterId);
    if (!chapter) return;
    updateChapter(chapterId, { blocks: [...chapter.blocks, blankStoryBlock(type)] });
  }

  function removeBlock(chapterId: string, blockId: string) {
    const chapter = chapters.find((c) => c.id === chapterId);
    if (!chapter) return;
    updateChapter(chapterId, { blocks: chapter.blocks.filter((b) => b.id !== blockId) });
  }

  function duplicateChapter(chapter: StoryChapter) {
    const copy: StoryChapter = {
      ...chapter,
      id: `sc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      label: `${chapter.label} copy`,
      blocks: chapter.blocks.map((b) => ({
        ...b,
        id: `sb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        facts: { ...b.facts },
        galleryBlocks: b.galleryBlocks.map((g) => ({ ...g, itemIds: [...g.itemIds] })),
      })),
    };
    onChange([...chapters, copy]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={`text-sm font-medium ${label}`}>Stories</p>
          <p className={`mt-0.5 text-xs ${muted}`}>
            Stack multiple mini case studies on one page. Add blocks freely, or insert a full
            case-study template.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onConvertLegacy && chapters.length === 0 ? (
            <button type="button" className="btn btn-ghost text-xs" onClick={onConvertLegacy}>
              Convert current page → Chapter 1
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost text-xs"
            onClick={() => onChange([...chapters, createFullCaseStudyChapter(`Story ${chapters.length + 1}`)])}
          >
            + Full case study
          </button>
          <button
            type="button"
            className="btn btn-ghost text-xs"
            onClick={() => onChange([...chapters, blankStoryChapter(`Story ${chapters.length + 1}`)])}
          >
            + Empty story
          </button>
        </div>
      </div>

      {chapters.length === 0 ? (
        <p className={`rounded-lg border ${border} ${panel} px-3 py-3 text-xs ${muted}`}>
          No stories yet — the classic single case study layout is used. Add a full case study or
          convert the current page.
        </p>
      ) : null}

      <ul className="space-y-4">
        {chapters.map((chapter, chapterIndex) => (
          <li key={chapter.id} className={`rounded-xl border ${border} ${panel} p-4 space-y-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <input
                className={`${input} max-w-xs font-medium`}
                value={chapter.label}
                onChange={(e) => updateChapter(chapter.id, { label: e.target.value })}
                placeholder="Story label (admin)"
              />
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  className="btn btn-ghost text-xs"
                  disabled={chapterIndex === 0}
                  onClick={() => moveChapter(chapterIndex, -1)}
                >
                  Up
                </button>
                <button
                  type="button"
                  className="btn btn-ghost text-xs"
                  disabled={chapterIndex === chapters.length - 1}
                  onClick={() => moveChapter(chapterIndex, 1)}
                >
                  Down
                </button>
                <button
                  type="button"
                  className="btn btn-ghost text-xs"
                  onClick={() => duplicateChapter(chapter)}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  className="btn btn-ghost text-xs text-red-600"
                  onClick={() => onChange(chapters.filter((c) => c.id !== chapter.id))}
                >
                  Remove story
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                className={input + " max-w-[12rem]"}
                defaultValue=""
                onChange={(e) => {
                  const type = e.target.value as StoryBlockType;
                  if (STORY_BLOCK_TYPES.includes(type)) addBlock(chapter.id, type);
                  e.target.value = "";
                }}
              >
                <option value="">+ Add block…</option>
                {STORY_BLOCK_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {STORY_BLOCK_LABELS[type]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-ghost text-xs"
                onClick={() => {
                  const full = createFullCaseStudyChapter();
                  updateChapter(chapter.id, {
                    blocks: [...chapter.blocks, ...full.blocks],
                  });
                }}
              >
                Insert full case study blocks
              </button>
            </div>

            <ul className="space-y-3">
              {chapter.blocks.map((block, blockIndex) => (
                <li
                  key={block.id}
                  className={`rounded-lg border ${border} bg-white/40 p-3 space-y-2 dark:bg-black/20`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className={`text-xs uppercase tracking-[0.16em] ${label}`}>
                      {STORY_BLOCK_LABELS[block.type]}
                    </p>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="btn btn-ghost text-xs"
                        disabled={blockIndex === 0}
                        onClick={() => moveBlock(chapter.id, blockIndex, -1)}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost text-xs"
                        disabled={blockIndex === chapter.blocks.length - 1}
                        onClick={() => moveBlock(chapter.id, blockIndex, 1)}
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost text-xs text-red-600"
                        onClick={() => removeBlock(chapter.id, block.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {block.type === "title" ? (
                    <>
                      <input
                        className={input}
                        placeholder="Story title"
                        value={block.text}
                        onChange={(e) => updateBlock(chapter.id, block.id, { text: e.target.value })}
                      />
                      <input
                        className={input}
                        placeholder="Meta line (e.g. Office · New York)"
                        value={block.meta}
                        onChange={(e) => updateBlock(chapter.id, block.id, { meta: e.target.value })}
                      />
                    </>
                  ) : null}

                  {block.type === "facts" ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {(
                        [
                          ["client", "Client"],
                          ["projectType", "Project type"],
                          ["scope", "Scope"],
                          ["location", "Location"],
                          ["year", "Year"],
                        ] as const
                      ).map(([key, placeholder]) => (
                        <input
                          key={key}
                          className={input}
                          placeholder={placeholder}
                          value={block.facts[key]}
                          onChange={(e) =>
                            updateBlock(chapter.id, block.id, {
                              facts: { ...block.facts, [key]: e.target.value },
                            })
                          }
                        />
                      ))}
                    </div>
                  ) : null}

                  {block.type === "hero" ? (
                    <div className="space-y-2">
                      {heroUsesPoolIds ? (
                        <select
                          className={input}
                          value={block.heroMediaId}
                          onChange={(e) =>
                            updateBlock(chapter.id, block.id, { heroMediaId: e.target.value })
                          }
                        >
                          <option value="">Choose hero from pool…</option>
                          {pool.map((item, i) => (
                            <option key={item.id} value={item.id}>
                              {i + 1}. {item.alt || item.id}
                            </option>
                          ))}
                        </select>
                      ) : null}
                      <input
                        className={input}
                        placeholder="Or paste image URL"
                        value={block.heroImageUrl}
                        onChange={(e) =>
                          updateBlock(chapter.id, block.id, { heroImageUrl: e.target.value })
                        }
                      />
                      <input
                        className={input}
                        placeholder="Hero alt text"
                        value={block.heroImageAlt}
                        onChange={(e) =>
                          updateBlock(chapter.id, block.id, { heroImageAlt: e.target.value })
                        }
                      />
                    </div>
                  ) : null}

                  {block.type === "gallery" ? (
                    <GalleryBlocksEditor
                      blocks={block.galleryBlocks}
                      pool={pool}
                      onChange={(next) =>
                        updateBlock(chapter.id, block.id, { galleryBlocks: next })
                      }
                      tone={tone}
                    />
                  ) : null}

                  {[
                    "opening",
                    "context",
                    "approach",
                    "highlight",
                    "whoServes",
                    "execution",
                    "closing",
                    "credits",
                    "body",
                  ].includes(block.type) ? (
                    <textarea
                      className={input}
                      rows={block.type === "highlight" || block.type === "closing" ? 2 : 4}
                      placeholder={STORY_BLOCK_LABELS[block.type]}
                      value={block.text}
                      onChange={(e) => updateBlock(chapter.id, block.id, { text: e.target.value })}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
