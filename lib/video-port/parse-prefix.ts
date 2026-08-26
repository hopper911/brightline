import type { T9MediaRoot } from "@/lib/t9-media-root";
import {
  defaultSegmentForRoot,
  isKnownSegmentInKey,
  isValidSegment,
  segmentPatternForRoot,
} from "@/lib/t9-media-segments";

export type T9WebVideoContext = {
  root: T9MediaRoot;
  segment: string;
};

/** Derive Video Port destination from an R2 folder prefix. */
export function parseT9WebVideoPrefix(prefix: string): T9WebVideoContext | null {
  const clean = prefix.trim().replace(/^\/+/, "").replace(/\/$/, "");
  const portfolioSeg = segmentPatternForRoot("portfolio");
  const mirotechSeg = segmentPatternForRoot("mirotech", true);
  const m = clean.match(
    new RegExp(`^(portfolio|mirotech)\\/(${portfolioSeg}|${mirotechSeg})(?:\\/web_video)?$`, "i")
  );
  if (!m) return null;
  const root = m[1]!.toLowerCase() as T9MediaRoot;
  const segment = m[2]!.toLowerCase();
  if (!isKnownSegmentInKey(root, segment)) return null;
  return { root, segment };
}

export function isT9WebVideoPrefix(prefix: string): boolean {
  const parsed = parseT9WebVideoPrefix(prefix);
  if (!parsed) return false;
  return prefix.trim().replace(/^\/+/, "").includes("/web_video");
}

export { defaultSegmentForRoot, isValidSegment };
