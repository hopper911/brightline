/**
 * T9 Image/Video Port folder segments — root-specific (Brightline pillars vs Mirotech categories).
 */
import type { T9MediaRoot } from "@/lib/t9-media-root";

export const BRIGHTLINE_PILLARS = ["arc", "cam", "cor"] as const;
export type BrightlinePillar = (typeof BRIGHTLINE_PILLARS)[number];

/** Mirotech Work index filters (excluding "All"). */
export const MIROTECH_CATEGORIES = [
  "product",
  "editorial",
  "brand",
  "service",
  "research",
  "motion",
] as const;
export type MirotechCategory = (typeof MIROTECH_CATEGORIES)[number];

/** Legacy Mirotech uploads used Brightline photography pillars — read-only. */
export const LEGACY_MIROTECH_PILLARS = BRIGHTLINE_PILLARS;

export type T9MediaSegment = BrightlinePillar | MirotechCategory;

const BRIGHTLINE_LABELS: Record<BrightlinePillar, string> = {
  arc: "Architecture (arc)",
  cam: "Campaign (cam)",
  cor: "Corporate (cor)",
};

const MIROTECH_LABELS: Record<MirotechCategory, string> = {
  product: "Product",
  editorial: "Editorial",
  brand: "Brand",
  service: "Service",
  research: "Research",
  motion: "Motion",
};

export type SegmentOption = { id: string; label: string };

export function segmentsForRoot(root: T9MediaRoot): readonly SegmentOption[] {
  if (root === "mirotech") {
    return MIROTECH_CATEGORIES.map((id) => ({
      id,
      label: MIROTECH_LABELS[id],
    }));
  }
  return BRIGHTLINE_PILLARS.map((id) => ({
    id,
    label: BRIGHTLINE_LABELS[id],
  }));
}

export function defaultSegmentForRoot(root: T9MediaRoot): string {
  return root === "mirotech" ? "product" : "arc";
}

export function segmentLabel(root: T9MediaRoot, segment: string): string {
  if (root === "mirotech") {
    const cat = segment.toLowerCase() as MirotechCategory;
    return MIROTECH_LABELS[cat] ?? segment;
  }
  const pillar = segment.toLowerCase() as BrightlinePillar;
  return BRIGHTLINE_LABELS[pillar] ?? segment;
}

/** Valid segment for new uploads under the given root. */
export function isValidSegment(root: T9MediaRoot, segment: unknown): segment is string {
  if (typeof segment !== "string" || !segment.trim()) return false;
  const s = segment.toLowerCase().trim();
  if (root === "mirotech") {
    return (MIROTECH_CATEGORIES as readonly string[]).includes(s);
  }
  return (BRIGHTLINE_PILLARS as readonly string[]).includes(s);
}

/** Reject new writes to legacy mirotech/arc|cam|cor paths. */
export function isLegacyMirotechPillar(segment: unknown): boolean {
  if (typeof segment !== "string") return false;
  return (LEGACY_MIROTECH_PILLARS as readonly string[]).includes(
    segment.toLowerCase().trim() as BrightlinePillar
  );
}

/** Regex alternation for all known segments under a root (includes legacy mirotech pillars for read). */
export function segmentPatternForRoot(root: T9MediaRoot, includeLegacy = false): string {
  if (root === "mirotech") {
    const cats = MIROTECH_CATEGORIES.join("|");
    if (includeLegacy) {
      return `(?:${cats}|${LEGACY_MIROTECH_PILLARS.join("|")})`;
    }
    return `(?:${cats})`;
  }
  return `(?:${BRIGHTLINE_PILLARS.join("|")})`;
}

/** Any segment valid for read/browse (portfolio pillars + mirotech categories + legacy). */
export function isKnownSegmentInKey(root: T9MediaRoot, segment: string): boolean {
  const s = segment.toLowerCase();
  if (root === "portfolio") {
    return (BRIGHTLINE_PILLARS as readonly string[]).includes(s);
  }
  return (
    (MIROTECH_CATEGORIES as readonly string[]).includes(s) ||
    (LEGACY_MIROTECH_PILLARS as readonly string[]).includes(s)
  );
}

export function assertValidSegmentForWrite(
  root: T9MediaRoot,
  segment: unknown
): asserts segment is string {
  if (!isValidSegment(root, segment)) {
    const hint =
      root === "mirotech"
        ? "Use a Mirotech work category: product, editorial, brand, service, research, motion."
        : "Use a Brightline pillar: arc, cam, cor.";
    throw Object.assign(new Error(`Invalid segment for ${root}. ${hint}`), { status: 400 });
  }
  if (root === "mirotech" && isLegacyMirotechPillar(segment)) {
    throw Object.assign(
      new Error(
        "Mirotech no longer uses Brightline pillars (arc/cam/cor). Pick a work category instead."
      ),
      { status: 400 }
    );
  }
}
