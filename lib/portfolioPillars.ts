import type { WorkSection } from "@prisma/client";

/** All Prisma WorkSection enum values (for API validation). */
export const WORK_SECTIONS: WorkSection[] = ["ACD", "REA", "CUL", "BIZ", "TRI"];

export const PILLAR_SLUGS = ["architecture", "advertising", "corporate"] as const;
export type PillarSlug = (typeof PILLAR_SLUGS)[number];

export type PillarConfig = {
  slug: PillarSlug;
  label: string;
  description: string;
  /** One line under the card title on the homepage */
  homeMeta: string;
  /** DB sections that belong to this pillar */
  sections: WorkSection[];
};

export const PILLARS: PillarConfig[] = [
  {
    slug: "architecture",
    label: "Architecture",
    description:
      "Buildings, interiors, and spaces—imagery for listings, proposals, hospitality, and destinations, prepared for web and brand use.",
    homeMeta: "Spaces & places · ready for listings & brand",
    sections: ["REA", "TRI"],
  },
  {
    slug: "advertising",
    label: "Advertising",
    description:
      "Editorial and campaign work for brands and agencies—visual stories built to travel across web, social, and print.",
    homeMeta: "Brand & editorial · built for every channel",
    sections: ["ACD", "CUL"],
  },
  {
    slug: "corporate",
    label: "Corporate",
    description:
      "Workplace, leadership, and professional imagery—assets that support trust, recruiting, and communications.",
    homeMeta: "Teams & leadership · aligned to your narrative",
    sections: ["BIZ"],
  },
];

/** Map DB WorkSection to pillar slug (for project URLs). */
export const SECTION_TO_PILLAR: Record<WorkSection, PillarSlug> = {
  REA: "architecture",
  TRI: "architecture",
  ACD: "advertising",
  CUL: "advertising",
  BIZ: "corporate",
};

/** Map pillar slug to first WorkSection (for Admin create). */
export const PILLAR_TO_SECTION: Record<PillarSlug, WorkSection> = {
  architecture: "REA",
  advertising: "ACD",
  corporate: "BIZ",
};

export function getPillarBySlug(slug: string): PillarConfig | null {
  return PILLARS.find((p) => p.slug === slug) ?? null;
}

export function isPillarSlug(value: string): value is PillarSlug {
  return PILLAR_SLUGS.includes(value as PillarSlug);
}
