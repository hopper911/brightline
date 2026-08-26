"use client";

import Image from "next/image";
import Reveal from "@/components/Reveal";
import GalleryBlocks from "@/components/gallery/GalleryBlocks";
import type { GalleryPoolItem } from "@/lib/gallery-blocks";
import type { StoryBlock, StoryChapter } from "@/lib/story-chapters";

const BLUR_DATA =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iNyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iI2U4ZTllYSIvPjwvc3ZnPg==";

type Props = {
  chapters: StoryChapter[];
  pool: GalleryPoolItem[];
  /** Resolve Work hero media id → url (optional). */
  resolveHeroUrl?: (mediaId: string) => { src: string; alt: string } | null;
  className?: string;
};

function Panel({
  kicker,
  children,
}: {
  kicker?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
      {kicker ? <p className="section-kicker">{kicker}</p> : null}
      <div className={kicker ? "mt-4" : undefined}>{children}</div>
    </div>
  );
}

function StoryBlockView({
  block,
  pool,
  resolveHeroUrl,
}: {
  block: StoryBlock;
  pool: GalleryPoolItem[];
  resolveHeroUrl?: Props["resolveHeroUrl"];
}) {
  switch (block.type) {
    case "title": {
      if (!block.text.trim()) return null;
      return (
        <Reveal className="flex flex-col gap-2">
          <h2 className="section-title">{block.text.trim()}</h2>
          {block.meta.trim() ? (
            <p className="text-sm uppercase tracking-[0.3em] text-white/50">{block.meta.trim()}</p>
          ) : null}
        </Reveal>
      );
    }
    case "opening": {
      if (!block.text.trim()) return null;
      return (
        <Reveal>
          <div className="max-w-3xl whitespace-pre-wrap text-lg leading-relaxed text-white/85">
            {block.text.trim()}
          </div>
        </Reveal>
      );
    }
    case "hero": {
      const fromPool = block.heroMediaId
        ? pool.find((p) => p.id === block.heroMediaId)
        : null;
      const resolved = block.heroMediaId && resolveHeroUrl ? resolveHeroUrl(block.heroMediaId) : null;
      const src = fromPool?.src || resolved?.src || block.heroImageUrl;
      const alt = fromPool?.alt || resolved?.alt || block.heroImageAlt || block.text || "Hero";
      if (!src) {
        return (
          <Reveal>
            <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/80 text-white/40">
              <span className="text-sm uppercase tracking-[0.2em]">No hero image</span>
            </div>
          </Reveal>
        );
      }
      return (
        <Reveal>
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black image-guard-overlay">
            <Image
              src={src}
              alt={alt}
              fill
              draggable={false}
              sizes="(min-width: 1280px) 1152px, 100vw"
              quality={90}
              placeholder="blur"
              blurDataURL={BLUR_DATA}
              className="object-cover image-fade"
            />
          </div>
        </Reveal>
      );
    }
    case "facts": {
      const f = block.facts;
      const rows: [string, string][] = [
        ["Client", f.client],
        ["Project type", f.projectType],
        ["Scope", f.scope],
        ["Location", f.location],
        ["Year", f.year],
      ].filter(([, v]) => v.trim()) as [string, string][];
      if (rows.length === 0) return null;
      return (
        <Reveal>
          <Panel kicker="Project facts">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              {rows.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-white/50">{label}</dt>
                  <dd className="text-white/80">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </Reveal>
      );
    }
    case "context":
    case "approach":
    case "execution":
    case "whoServes":
    case "body":
    case "credits": {
      if (!block.text.trim()) return null;
      const kickers: Record<string, string> = {
        context: "Context",
        approach: "Approach",
        execution: "Execution",
        whoServes: "Who this photography serves",
        body: "Story",
        credits: "Credits",
      };
      return (
        <Reveal>
          <Panel kicker={kickers[block.type]}>
            <p
              className={`whitespace-pre-wrap ${
                block.type === "credits" ? "text-sm leading-relaxed text-white/60" : "text-base text-white/80"
              }`}
            >
              {block.text.trim()}
            </p>
          </Panel>
        </Reveal>
      );
    }
    case "highlight": {
      if (!block.text.trim()) return null;
      return (
        <Reveal>
          <blockquote className="border-l-2 border-white/30 pl-6 font-display text-xl italic leading-snug text-white/90">
            {block.text.trim()}
          </blockquote>
        </Reveal>
      );
    }
    case "closing": {
      if (!block.text.trim()) return null;
      return (
        <Reveal>
          <p className="text-center text-lg text-white/80">{block.text.trim()}</p>
        </Reveal>
      );
    }
    case "gallery": {
      if (block.galleryBlocks.length === 0) return null;
      return (
        <GalleryBlocks
          blocks={block.galleryBlocks}
          pool={pool}
          showSectionHeading
          sectionHint="Use arrows to browse. Click an image for full size."
        />
      );
    }
    default:
      return null;
  }
}

/**
 * Renders stacked mini case-study chapters (each with its own title/hero when present).
 */
export default function StoryChapters({
  chapters,
  pool,
  resolveHeroUrl,
  className = "",
}: Props) {
  if (chapters.length === 0) return null;

  return (
    <div className={`space-y-20 ${className}`}>
      {chapters.map((chapter, index) => (
        <section
          key={chapter.id}
          className={index > 0 ? "border-t border-white/10 pt-16" : undefined}
          aria-label={chapter.label || `Story ${index + 1}`}
        >
          <div className="space-y-10">
            {chapter.blocks.map((block) => (
              <StoryBlockView
                key={block.id}
                block={block}
                pool={pool}
                resolveHeroUrl={resolveHeroUrl}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
