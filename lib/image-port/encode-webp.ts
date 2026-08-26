/**
 * Image Port encode helpers — parity with tools/upload-watcher.mjs WebP defaults.
 */
import sharp from "sharp";
import type { T9MediaRoot } from "@/lib/t9-media-root";
import { segmentPatternForRoot } from "@/lib/t9-media-segments";

/** @deprecated Use segment string validated via isValidSegment(root, segment) */
export const IMAGE_PORT_PILLARS = ["arc", "cam", "cor"] as const;
export type ImagePortPillar = (typeof IMAGE_PORT_PILLARS)[number];

export const IMAGE_PORT_TEMP_PREFIX = "tmp/image-port/";

export const FULL_MAX_EDGE = 2400;
export const THUMB_LONG_EDGE = 800;
export const FULL_WEBP_QUALITY = 85;
export const THUMB_WEBP_QUALITY = 72;

/** MIME types accepted for Image Port ingest (still images only). */
export const IMAGE_PORT_INPUT_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

/** @deprecated Use isValidSegment from t9-media-segments */
export function isImagePortPillar(value: unknown): value is ImagePortPillar {
  return typeof value === "string" && (IMAGE_PORT_PILLARS as readonly string[]).includes(value);
}

export function isImagePortTempKey(key: string): boolean {
  const clean = key.trim().replace(/^\/+/, "").toLowerCase();
  if (!clean.startsWith(IMAGE_PORT_TEMP_PREFIX)) return false;
  if (clean.includes("..") || clean.includes("\0") || clean.includes("\\")) return false;
  return true;
}

export function yyMmDdUtc(date = new Date()): string {
  const yy = String(date.getUTCFullYear()).slice(-2);
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

export function formatPortfolioStem(segment: string, yymmdd: string, seq: number): string {
  return `${segment}-${yymmdd}-${String(seq).padStart(2, "0")}`;
}

export function portfolioKeysForStem(
  segment: string,
  stem: string,
  root: T9MediaRoot = "portfolio"
): {
  fullKey: string;
  thumbKey: string;
} {
  const file = `${stem}.webp`;
  return {
    fullKey: `${root}/${segment}/web_full/${file}`,
    thumbKey: `${root}/${segment}/web_thumb/${file}`,
  };
}

/** Parse highest seq from keys like portfolio/arc/web_full/arc-260811-02.webp */
export function maxSeqFromKeys(
  keys: string[],
  segment: string,
  yymmdd: string,
  root: T9MediaRoot = "portfolio"
): number {
  const re = new RegExp(
    `^${root}/${segment}/web_full/${segment}-${yymmdd}-(\\d+)\\.webp$`,
    "i"
  );
  let max = 0;
  for (const key of keys) {
    const m = key.replace(/^\/+/, "").match(re);
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

/** Match image port keys under any known segment for the root (incl. legacy mirotech pillars). */
export function isImagePortStoredKey(key: string, root: T9MediaRoot = "portfolio"): boolean {
  const clean = key.trim().replace(/^\/+/, "").toLowerCase();
  const seg = segmentPatternForRoot(root, root === "mirotech");
  return new RegExp(`^${root}/${seg}/web_(?:full|thumb)/.+\\.webp$`).test(clean);
}

export type EncodedWebpPair = {
  full: Buffer;
  thumb: Buffer;
};

export async function encodePortfolioWebpPair(input: Buffer): Promise<EncodedWebpPair> {
  const base = sharp(input, { failOn: "none" }).rotate();
  const meta = await base.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const longEdge = Math.max(width, height);

  let fullPipeline = sharp(input, { failOn: "none" }).rotate();
  if (longEdge > FULL_MAX_EDGE) {
    fullPipeline = fullPipeline.resize({
      width: FULL_MAX_EDGE,
      height: FULL_MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    });
  }
  const full = await fullPipeline.webp({ quality: FULL_WEBP_QUALITY }).toBuffer();

  const thumb = await sharp(input, { failOn: "none" })
    .rotate()
    .resize({
      width: THUMB_LONG_EDGE,
      height: THUMB_LONG_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: THUMB_WEBP_QUALITY })
    .toBuffer();

  return { full, thumb };
}

export function extForContentType(contentType: string): string {
  const ct = contentType.toLowerCase();
  if (ct === "image/png") return "png";
  if (ct === "image/webp") return "webp";
  return "jpg";
}
