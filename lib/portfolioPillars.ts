import type { WorkSection } from "@prisma/client";

/** All Prisma WorkSection enum values (for API validation). */
export const WORK_SECTIONS: WorkSection[] = ["ACD", "REA", "CUL", "BIZ", "TRI"];

/** Dynamic work pillar (public URLs `/work/{slug}`). */
export type PillarConfig = {
  slug: string;
  label: string;
  description: string;
  /** One line under the card title on the homepage */
  homeMeta: string;
  /** DB sections that belong to this pillar (each section may appear on only one pillar). */
  sections: WorkSection[];
  visible: boolean;
  /** R2 object key, or `/path`, or `https://...` — empty = use featured hero */
  coverImageKey: string;
  coverAlt: string;
  sortOrder: number;
};

/** @deprecated Prefer plain `string` slugs from CMS; alias kept for existing imports. */
export type PillarSlug = string;

export const PILLARS: PillarConfig[] = [
  {
    slug: "architecture",
    label: "Architecture",
    description:
      "Buildings, interiors, and spaces—imagery for listings, proposals, hospitality, and destinations, prepared for web and brand use.",
    homeMeta: "Spaces & places · ready for listings & brand",
    sections: ["REA", "TRI"],
    visible: true,
    coverImageKey: "",
    coverAlt: "",
    sortOrder: 0,
  },
  {
    slug: "advertising",
    label: "Advertising",
    description:
      "Editorial and campaign work for brands and agencies—visual stories built to travel across web, social, and print.",
    homeMeta: "Brand & editorial · built for every channel",
    sections: ["ACD", "CUL"],
    visible: true,
    coverImageKey: "",
    coverAlt: "",
    sortOrder: 1,
  },
  {
    slug: "corporate",
    label: "Corporate",
    description:
      "Workplace, leadership, and professional imagery—assets that support trust, recruiting, and communications.",
    homeMeta: "Teams & leadership · aligned to your narrative",
    sections: ["BIZ"],
    visible: true,
    coverImageKey: "",
    coverAlt: "",
    sortOrder: 2,
  },
];

/** Default slugs in order — use for admin dropdowns seeded from code. */
export const PILLAR_SLUGS: readonly string[] = PILLARS.map((p) => p.slug);

/** @deprecated Alias — use `PILLAR_SLUGS`. */
export const DEFAULT_PILLAR_SLUG_ORDER = PILLAR_SLUGS;

export function buildSectionToPillarMap(pillars: PillarConfig[]): Record<WorkSection, string> {
  const map = {} as Record<WorkSection, string>;
  for (const p of pillars) {
    for (const s of p.sections) {
      if (map[s]) {
        throw new Error(`Work section ${s} cannot belong to two pillars (${map[s]} and ${p.slug}).`);
      }
      map[s] = p.slug;
    }
  }
  return map;
}

/** Default mapping (canonical three pillars). For dynamic routing use `getSectionToPillarSlugMap` in work-pillar-settings. */
export const SECTION_TO_PILLAR: Record<WorkSection, string> = buildSectionToPillarMap(PILLARS);

/** Default primary section for each canonical slug (new Work admin project). */
export const PILLAR_TO_SECTION: Record<string, WorkSection> = Object.fromEntries(
  PILLARS.map((p) => [p.slug, p.sections[0]!])
);

export function getPrimaryWorkSection(pillar: PillarConfig): WorkSection {
  const s = pillar.sections[0];
  if (!s) throw new Error(`Pillar ${pillar.slug} has no work sections`);
  return s;
}

const PILLAR_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const RESERVED_PILLAR_SLUGS = new Set(
  [
    "admin",
    "api",
    "studio",
    "work",
    "galleries",
    "services",
    "contact",
    "about",
    "blog",
    "portfolio",
    "case-studies",
    "process",
    "privacy",
    "terms",
    "login",
    "media",
    "commercial-photographer-nyc",
    "architecture-photographer-nyc",
    "corporate-photographer-nyc",
    "real-estate-photographer-jersey-city",
    "_next",
    "favicon.ico",
  ].map((s) => s.toLowerCase())
);

export function isValidPillarSlugFormat(slug: string): boolean {
  if (!slug || slug.length > 48 || !PILLAR_SLUG_PATTERN.test(slug)) return false;
  return true;
}

export function isReservedPillarSlug(slug: string): boolean {
  return RESERVED_PILLAR_SLUGS.has(slug.toLowerCase());
}

/** Pillar exists in default trio only — does not check CMS pillars. */
export function isDefaultPillarSlug(value: string): boolean {
  return PILLARS.some((p) => p.slug === value);
}

/**
 * @deprecated Use `isKnownPillarSlug` from work-pillar-settings in server code.
 * Client-side quick check against defaults only.
 */
export function isPillarSlug(value: string): value is PillarSlug {
  return isDefaultPillarSlug(value);
}

/** Defaults only — does not read CMS. */
export function getPillarBySlug(slug: string): PillarConfig | null {
  return PILLARS.find((p) => p.slug === slug) ?? null;
}
