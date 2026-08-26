/**
 * Multi-story chapters — ordered pick-and-choose blocks inside one Work/Blog/Travel page.
 * Each chapter can be a full mini case study (own title/hero).
 */

import { blankGalleryBlock, cleanGalleryBlocks, type GalleryBlock } from "@/lib/gallery-blocks";

export const STORY_BLOCK_TYPES = [
  "title",
  "opening",
  "hero",
  "facts",
  "context",
  "approach",
  "highlight",
  "whoServes",
  "gallery",
  "execution",
  "closing",
  "credits",
  "body",
] as const;

export type StoryBlockType = (typeof STORY_BLOCK_TYPES)[number];

export type StoryFacts = {
  client: string;
  projectType: string;
  scope: string;
  location: string;
  year: string;
};

export type StoryBlock = {
  id: string;
  type: StoryBlockType;
  /** Primary text (title, opening, context, body, etc.). */
  text: string;
  /** Meta line under title, e.g. "Office · New York". */
  meta: string;
  facts: StoryFacts;
  /** Work/Studio MediaAsset id for hero. */
  heroMediaId: string;
  /** Blog/Travel image URL for hero when not using media id. */
  heroImageUrl: string;
  heroImageAlt: string;
  /** Nested gallery layout for this chapter (shared pool). */
  galleryBlocks: GalleryBlock[];
};

export type StoryChapter = {
  id: string;
  /** Admin-only label in the editor list. */
  label: string;
  blocks: StoryBlock[];
};

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function blankFacts(): StoryFacts {
  return { client: "", projectType: "", scope: "", location: "", year: "" };
}

export function blankStoryBlock(type: StoryBlockType): StoryBlock {
  return {
    id: newId("sb"),
    type,
    text: "",
    meta: "",
    facts: blankFacts(),
    heroMediaId: "",
    heroImageUrl: "",
    heroImageAlt: "",
    galleryBlocks: type === "gallery" ? [blankGalleryBlock("carousel"), blankGalleryBlock("grid")] : [],
  };
}

/** Full FinTech-style case study chapter (template A). */
export function createFullCaseStudyChapter(label = "Story"): StoryChapter {
  const types: StoryBlockType[] = [
    "title",
    "opening",
    "hero",
    "facts",
    "context",
    "approach",
    "highlight",
    "whoServes",
    "gallery",
    "execution",
    "closing",
    "credits",
  ];
  return {
    id: newId("sc"),
    label,
    blocks: types.map((type) => blankStoryBlock(type)),
  };
}

export function blankStoryChapter(label = "Story"): StoryChapter {
  return {
    id: newId("sc"),
    label,
    blocks: [blankStoryBlock("title"), blankStoryBlock("opening")],
  };
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanFacts(value: unknown): StoryFacts {
  const defaults = blankFacts();
  if (!value || typeof value !== "object") return defaults;
  const row = value as Record<string, unknown>;
  return {
    client: cleanString(row.client),
    projectType: cleanString(row.projectType),
    scope: cleanString(row.scope),
    location: cleanString(row.location),
    year: cleanString(row.year),
  };
}

export function cleanStoryBlock(value: unknown): StoryBlock | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const typeRaw = cleanString(row.type);
  if (!STORY_BLOCK_TYPES.includes(typeRaw as StoryBlockType)) return null;
  const type = typeRaw as StoryBlockType;
  return {
    id: cleanString(row.id) || newId("sb"),
    type,
    text: typeof row.text === "string" ? row.text : "",
    meta: cleanString(row.meta),
    facts: cleanFacts(row.facts),
    heroMediaId: cleanString(row.heroMediaId),
    heroImageUrl: cleanString(row.heroImageUrl),
    heroImageAlt: cleanString(row.heroImageAlt),
    galleryBlocks: cleanGalleryBlocks(row.galleryBlocks),
  };
}

export function cleanStoryChapters(value: unknown): StoryChapter[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const blocksRaw = Array.isArray(row.blocks) ? row.blocks : [];
      const blocks = blocksRaw
        .map((b) => cleanStoryBlock(b))
        .filter((b): b is StoryBlock => Boolean(b));
      if (blocks.length === 0) return null;
      return {
        id: cleanString(row.id) || newId("sc"),
        label: cleanString(row.label) || "Story",
        blocks,
      } satisfies StoryChapter;
    })
    .filter((c): c is StoryChapter => Boolean(c));
}

export const STORY_BLOCK_LABELS: Record<StoryBlockType, string> = {
  title: "Title",
  opening: "Opening",
  hero: "Hero image",
  facts: "Project facts",
  context: "Context",
  approach: "Approach",
  highlight: "Highlight quote",
  whoServes: "Who this serves",
  gallery: "Gallery",
  execution: "Execution",
  closing: "Closing",
  credits: "Credits",
  body: "Body text",
};

/** Convert classic Work scalar case study into chapter 1. */
export function workProjectToChapter(input: {
  title: string;
  projectType?: string | null;
  location?: string | null;
  year?: number | null;
  opening?: string | null;
  context?: string | null;
  approach?: string | null;
  highlight?: string | null;
  execution?: string | null;
  closing?: string | null;
  credits?: string | null;
  client?: string | null;
  scope?: string | null;
  whoIsThisFor?: string | null;
  heroMediaId?: string | null;
  galleryBlocks?: unknown;
}): StoryChapter {
  const chapter = createFullCaseStudyChapter("Chapter 1");
  const meta = [input.projectType, input.location, input.year != null ? String(input.year) : null]
    .filter(Boolean)
    .join(" · ");

  for (const block of chapter.blocks) {
    switch (block.type) {
      case "title":
        block.text = input.title || "";
        block.meta = meta;
        break;
      case "opening":
        block.text = input.opening || "";
        break;
      case "hero":
        block.heroMediaId = input.heroMediaId || "";
        break;
      case "facts":
        block.facts = {
          client: input.client || "",
          projectType: input.projectType || "",
          scope: input.scope || "",
          location: input.location || "",
          year: input.year != null ? String(input.year) : "",
        };
        break;
      case "context":
        block.text = input.context || "";
        break;
      case "approach":
        block.text = input.approach || "";
        break;
      case "highlight":
        block.text = input.highlight || "";
        break;
      case "whoServes":
        block.text = input.whoIsThisFor || "";
        break;
      case "gallery":
        block.galleryBlocks = cleanGalleryBlocks(input.galleryBlocks);
        if (block.galleryBlocks.length === 0) {
          block.galleryBlocks = [blankGalleryBlock("carousel"), blankGalleryBlock("grid")];
        }
        break;
      case "execution":
        block.text = input.execution || "";
        break;
      case "closing":
        block.text = input.closing || "";
        break;
      case "credits":
        block.text = input.credits || "";
        break;
      default:
        break;
    }
  }
  return chapter;
}

/** Convert classic blog post into chapter 1. */
export function blogPostToChapter(input: {
  title: string;
  excerpt?: string;
  body?: string;
  pullQuote?: string;
  photoCredits?: string;
  coverImageUrl?: string;
  coverImageAlt?: string;
  galleryBlocks?: unknown;
  caseBrief?: string;
  caseProblem?: string;
  caseSolution?: string;
}): StoryChapter {
  const chapter = createFullCaseStudyChapter("Chapter 1");
  for (const block of chapter.blocks) {
    switch (block.type) {
      case "title":
        block.text = input.title || "";
        break;
      case "opening":
        block.text = input.excerpt || input.caseBrief || "";
        break;
      case "hero":
        block.heroImageUrl = input.coverImageUrl || "";
        block.heroImageAlt = input.coverImageAlt || "";
        break;
      case "context":
        block.text = input.caseProblem || "";
        break;
      case "approach":
        block.text = input.caseSolution || "";
        break;
      case "highlight":
        block.text = input.pullQuote || "";
        break;
      case "body":
        block.text = input.body || "";
        break;
      case "gallery":
        block.galleryBlocks = cleanGalleryBlocks(input.galleryBlocks);
        if (block.galleryBlocks.length === 0) {
          block.galleryBlocks = [blankGalleryBlock("grid")];
        }
        break;
      case "credits":
        block.text = input.photoCredits || "";
        break;
      default:
        break;
    }
  }
  // Ensure body exists in converted blog chapters
  if (!chapter.blocks.some((b) => b.type === "body") && input.body?.trim()) {
    const body = blankStoryBlock("body");
    body.text = input.body;
    const galleryIdx = chapter.blocks.findIndex((b) => b.type === "gallery");
    chapter.blocks.splice(galleryIdx >= 0 ? galleryIdx : chapter.blocks.length, 0, body);
  }
  return chapter;
}
