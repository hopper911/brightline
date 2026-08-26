/**
 * Allowlist payloads before proxying Studio Hub mutations to Mirotech.
 * Prevents mass-assignment of unexpected keys onto the content API.
 */

import { preferPortfolioWebFullKey } from "@/lib/portfolio-web-full";
import { normalizePortfolioVideoKey } from "@/lib/video-port/keys";

const HUB_PROJECT_KEYS = [
  "title",
  "slug",
  "subtitle",
  "summary",
  "year",
  "status",
  "categories",
  "disciplines",
  "tools",
  "platforms",
  "publishMirotech",
  "publishBrightline",
  "sortOrderMirotech",
  "sortOrderBrightline",
  "featuredMirotech",
  "featuredBrightline",
  "featured",
  "featuredOrder",
  "brightlineExternalId",
  "brightlineSection",
  "photoNarrative",
  "projectType",
  "challenge",
  "outcome",
  "role",
  "duration",
  "clientType",
  "projectDisclaimer",
  "whatsNext",
  "heroImage",
  "thumbnailImage",
  "backgroundMedia",
  "backgroundPoster",
  "seoTitle",
  "seoDescription",
  "publishedAt",
  "sections",
] as const;

const HUB_BLOG_KEYS = [
  "journalId",
  "title",
  "slug",
  "excerpt",
  "body",
  "status",
  "primarySite",
  "titleBrightline",
  "excerptBrightline",
  "bodyBrightline",
  "heroImage",
  "heroImageBrightline",
  "backgroundMedia",
  "backgroundPoster",
  "author",
  "categories",
  "tags",
  "featured",
  "articlePayload",
  "publishedAt",
] as const;

const PHOTO_NARRATIVE_KEYS = ["overview", "approach", "location", "notes"] as const;

const MAX_STRING = 20_000;
const MAX_ARRAY_ITEMS = 40;
const MAX_ARRAY_ITEM_LEN = 200;

function clipString(value: unknown, max = MAX_STRING): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max);
}

function clipStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, MAX_ARRAY_ITEM_LEN))
    .filter(Boolean)
    .slice(0, MAX_ARRAY_ITEMS);
}

function clipPhotoNarrative(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const src = value as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const key of PHOTO_NARRATIVE_KEYS) {
    const clipped = clipString(src[key], 8_000);
    if (clipped !== undefined) out[key] = clipped;
  }
  return out;
}

const SECTION_TYPES = new Set([
  "text",
  "image",
  "quote",
  "link",
  "gallery",
  "video",
  "metrics",
  "prototype",
]);

function upgradeSectionData(data: unknown, sectionType?: string): unknown {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;
  const src = data as Record<string, unknown>;
  const out: Record<string, unknown> = { ...src };
  const isVideo = sectionType === "video";
  const upgradeKey = (value: string) =>
    isVideo ? normalizePortfolioVideoKey(preferPortfolioWebFullKey(value)) : preferPortfolioWebFullKey(value);
  if (typeof out.src === "string") out.src = upgradeKey(out.src);
  if (typeof out.url === "string") out.url = upgradeKey(out.url);
  if (typeof out.key === "string") out.key = upgradeKey(out.key);
  if (typeof out.poster === "string") out.poster = normalizePortfolioVideoKey(preferPortfolioWebFullKey(out.poster));
  if (typeof out.posterKey === "string") {
    out.posterKey = normalizePortfolioVideoKey(preferPortfolioWebFullKey(out.posterKey));
  }
  if (isVideo && "loop" in out) {
    out.loop = !(out.loop === false || out.loop === "false" || out.loop === 0 || out.loop === "0");
  }
  if (Array.isArray(out.images)) {
    out.images = out.images.map((item) => {
      if (typeof item === "string") return preferPortfolioWebFullKey(item);
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const row = { ...(item as Record<string, unknown>) };
        if (typeof row.src === "string") row.src = preferPortfolioWebFullKey(row.src);
        if (typeof row.url === "string") row.url = preferPortfolioWebFullKey(row.url);
        if (typeof row.key === "string") row.key = preferPortfolioWebFullKey(row.key);
        return row;
      }
      return item;
    });
  }
  return out;
}

function sanitizeSections(value: unknown): Array<Record<string, unknown>> | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.slice(0, 40).map((raw, index) => {
    const row =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : {};
    const typeRaw = typeof row.type === "string" ? row.type.trim().toLowerCase() : "text";
    const type = SECTION_TYPES.has(typeRaw) ? typeRaw : "text";
    let data: unknown = null;
    if (row.data && typeof row.data === "object") {
      data = upgradeSectionData(row.data, type);
    }
    return {
      type,
      title: clipString(row.title, 500) ?? null,
      body: clipString(row.body, 12_000) ?? null,
      data,
      sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : index,
    };
  });
}

function pickAllowlisted(
  body: Record<string, unknown>,
  keys: readonly string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (!(key in body)) continue;
    const value = body[key];
    if (value === null) {
      out[key] = null;
      continue;
    }
    if (typeof value === "boolean" || typeof value === "number") {
      out[key] = value;
      continue;
    }
    if (key === "photoNarrative") {
      const narrative = clipPhotoNarrative(value);
      if (narrative) out[key] = narrative;
      continue;
    }
    if (key === "categories" || key === "disciplines" || key === "tools" || key === "platforms" || key === "tags") {
      const arr = clipStringArray(value);
      if (arr) out[key] = arr;
      continue;
    }
    if (key === "sections") {
      const sections = sanitizeSections(value);
      if (sections) out[key] = sections;
      continue;
    }
    if (key === "articlePayload" && value && typeof value === "object") {
      out[key] = value;
      continue;
    }
    if (typeof value === "string") {
      const clipped = clipString(value);
      if (clipped === undefined) continue;
      if (
        key === "heroImage" ||
        key === "thumbnailImage" ||
        key === "heroImageBrightline" ||
        key === "backgroundPoster"
      ) {
        out[key] = preferPortfolioWebFullKey(clipped);
      } else {
        out[key] = clipped;
      }
    }
  }
  return out;
}

export function sanitizeHubProjectPayload(
  body: Record<string, unknown>
): Record<string, unknown> {
  return pickAllowlisted(body, HUB_PROJECT_KEYS);
}

export function sanitizeHubBlogPayload(body: Record<string, unknown>): Record<string, unknown> {
  return pickAllowlisted(body, HUB_BLOG_KEYS);
}
