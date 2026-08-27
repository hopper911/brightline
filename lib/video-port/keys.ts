/**
 * Video Port R2 key helpers — {portfolio|mirotech}/{segment}/web_video/{stem}.mp4 (+ poster).
 */

import type { T9MediaRoot } from "@/lib/t9-media-root";
import { segmentPatternForRoot } from "@/lib/t9-media-segments";

/** @deprecated Brightline-only; use segment string + isValidSegment */
export const VIDEO_PORT_PILLARS = ["arc", "cam", "cor"] as const;
export type VideoPortPillar = (typeof VIDEO_PORT_PILLARS)[number];

export const VIDEO_PORT_TEMP_PREFIX = "tmp/video-port/";
export const VIDEO_PORT_LONG_EDGE = 1920;
export const VIDEO_PORT_POSTER_MAX_EDGE = 1600;

export const VIDEO_PORT_INPUT_MIME = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
  "video/x-msvideo",
  "video/mpeg",
  "video/3gpp",
  "video/3gpp2",
  "application/mp4",
]);

const VIDEO_PORT_INPUT_EXT = /\.(mp4|webm|mov|m4v|mkv|avi|mpe?g|3gp|mts|m2ts)$/i;
const T9_VIDEO_ROOT_RE = "(?:portfolio|mirotech)";

export function isAcceptedVideoFile(file: { name: string; type?: string }): boolean {
  const type = (file.type || "").toLowerCase().trim();
  if (type.startsWith("video/")) return true;
  if (VIDEO_PORT_INPUT_MIME.has(type)) return true;
  if (!type || type === "application/octet-stream") {
    return VIDEO_PORT_INPUT_EXT.test(file.name);
  }
  return VIDEO_PORT_INPUT_EXT.test(file.name);
}

/** @deprecated Use isValidSegment from t9-media-segments */
export function isVideoPortPillar(value: unknown): value is VideoPortPillar {
  return typeof value === "string" && (VIDEO_PORT_PILLARS as readonly string[]).includes(value);
}

export function isVideoPortTempKey(key: string): boolean {
  const clean = key.trim().replace(/^\/+/, "").toLowerCase();
  if (!clean.startsWith(VIDEO_PORT_TEMP_PREFIX)) return false;
  if (clean.includes("..") || clean.includes("\0") || clean.includes("\\")) return false;
  return true;
}

export function isVideoPortVideoKey(key: string): boolean {
  const clean = key.trim().replace(/^\/+/, "").toLowerCase();
  const portfolioSeg = segmentPatternForRoot("portfolio");
  const mirotechSeg = segmentPatternForRoot("mirotech", true);
  return (
    new RegExp(`^portfolio\\/${portfolioSeg}\\/web_video\\/.+\\.mp4$`).test(clean) ||
    new RegExp(`^mirotech\\/${mirotechSeg}\\/web_video\\/.+\\.mp4$`).test(clean) ||
    new RegExp(`^mirotech\\/portfolio\\/${portfolioSeg}\\/web_video\\/.+\\.mp4$`).test(clean)
  );
}

/**
 * Repair incomplete Video Port paths (common when pasting the stem without extension).
 */
export function normalizePortfolioVideoKey(keyOrUrl: string): string {
  const raw = keyOrUrl.trim();
  if (!raw) return raw;

  const portfolioSeg = segmentPatternForRoot("portfolio");
  const mirotechSeg = segmentPatternForRoot("mirotech", true);

  const apply = (key: string): string => {
    const clean = key.replace(/^\/+/, "");
    const legacy = clean.match(
      new RegExp(
        `^(portfolio\\/${portfolioSeg}|mirotech\\/${mirotechSeg})\\/web_video\\/([^/?#]+?)(\\.(mp4|webm|mov|m4v|webp|png|jpe?g))?$`,
        "i"
      )
    );
    if (legacy) {
      const prefix = `${legacy[1]}/web_video/`;
      const stem = legacy[2]!.replace(/[^a-zA-Z0-9._-]+/g, "");
      if (!stem) return clean;
      const ext = legacy[3];
      if (ext) return `${prefix}${stem}${ext.toLowerCase()}`;
      if (/-poster$/i.test(stem)) return `${prefix}${stem}.webp`;
      return `${prefix}${stem}.mp4`;
    }
    const reorg = clean.match(
      new RegExp(
        `^mirotech\\/portfolio\\/(${portfolioSeg})\\/web_video\\/([^/?#]+?)(\\.(mp4|webm|mov|m4v|webp|png|jpe?g))?$`,
        "i"
      )
    );
    if (reorg) {
      const prefix = `mirotech/portfolio/${reorg[1]}/web_video/`;
      const stem = reorg[2]!.replace(/[^a-zA-Z0-9._-]+/g, "");
      if (!stem) return clean;
      const ext = reorg[3];
      if (ext) return `${prefix}${stem}${ext.toLowerCase()}`;
      if (/-poster$/i.test(stem)) return `${prefix}${stem}.webp`;
      return `${prefix}${stem}.mp4`;
    }
    return clean;
  };

  if (/^https?:\/\//i.test(raw) || raw.startsWith("/")) {
    try {
      const base = raw.startsWith("/") ? "https://local.invalid" : undefined;
      const u = new URL(raw, base);
      const key = u.searchParams.get("key");
      if (key) {
        u.searchParams.set("key", apply(key));
        if (raw.startsWith("/")) return `${u.pathname}${u.search}${u.hash}`;
        return u.toString();
      }
      u.pathname = apply(u.pathname.replace(/^\/+/, ""));
      if (raw.startsWith("/")) return `${u.pathname}${u.search}${u.hash}`;
      return u.toString();
    } catch {
      return apply(raw);
    }
  }

  return apply(raw);
}

export function yyMmDdUtc(date = new Date()): string {
  const yy = String(date.getUTCFullYear()).slice(-2);
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

export function formatVideoStem(segment: string, yymmdd: string, seq: number): string {
  return `${segment}-${yymmdd}-${String(seq).padStart(2, "0")}`;
}

export function videoPortKeysForStem(
  segment: string,
  stem: string,
  root: T9MediaRoot = "portfolio"
): { videoKey: string; posterKey: string } {
  return {
    videoKey: `${root}/${segment}/web_video/${stem}.mp4`,
    posterKey: `${root}/${segment}/web_video/${stem}-poster.webp`,
  };
}

export function maxVideoSeqFromKeys(
  keys: string[],
  segment: string,
  yymmdd: string,
  root: T9MediaRoot = "portfolio"
): number {
  const re = new RegExp(
    `^${root}/${segment}/web_video/${segment}-${yymmdd}-(\\d+)(?:-poster)?\\.(mp4|webp)$`,
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

export function isVideoPortPosterKey(key: string): boolean {
  const clean = key.trim().replace(/^\/+/, "");
  const portfolioSeg = segmentPatternForRoot("portfolio");
  const mirotechSeg = segmentPatternForRoot("mirotech", true);
  return (
    new RegExp(
      `^portfolio\\/${portfolioSeg}\\/web_video\\/.+-poster\\.(webp|png)$`,
      "i"
    ).test(clean) ||
    new RegExp(
      `^mirotech\\/${mirotechSeg}\\/web_video\\/.+-poster\\.(webp|png)$`,
      "i"
    ).test(clean)
  );
}
