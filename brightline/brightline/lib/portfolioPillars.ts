import type { WorkSection } from "@prisma/client";

/** All Prisma WorkSection enum values (for API validation). */
export const WORK_SECTIONS: WorkSection[] = ["ACD", "REA", "CUL", "BIZ", "TRI"];

export const PILLAR_SLUGS = ["arc", "cam", "cor"] as const;
export type PillarSlug = (typeof PILLAR_SLUGS)[number];

export type PillarConfig = {
  slug: PillarSlug;
  label: string;
  description: string;
  /** DB sections that belong to this pillar */
  sections: WorkSection[];
};

export const PILLARS: PillarConfig[] = [
  {
    slug: "arc",
    label: "Architecture & Real Estate",
    description:
      "Real estate, architecture, and travel imagery for properties and destinations.",
    sections: ["REA", "TRI"],
  },
  {
    slug: "cam",
    label: "Campaign & Advertising",
    description:
      "Editorial campaigns, brand storytelling, and cultural projects for agencies and brands.",
    sections: ["ACD", "CUL"],
  },
  {
    slug: "cor",
    label: "Corporate & Executive",
    description:
      "Workplace, executive, and professional imagery for businesses and organizations.",
    sections: ["BIZ"],
  },
];

/** Map DB WorkSection to pillar slug (for project URLs). */
export const SECTION_TO_PILLAR: Record<WorkSection, PillarSlug> = {
  REA: "arc",
  TRI: "arc",
  ACD: "cam",
  CUL: "cam",
  BIZ: "cor",
};

/** Map pillar slug to first WorkSection (for Admin create). */
export const PILLAR_TO_SECTION: Record<PillarSlug, WorkSection> = {
  arc: "REA",
  cam: "ACD",
  cor: "BIZ",
};

export function getPillarBySlug(slug: string): PillarConfig | null {
  return PILLARS.find((p) => p.slug === slug) ?? null;
}

export function isPillarSlug(value: string): value is PillarSlug {
  return PILLAR_SLUGS.includes(value as PillarSlug);
}
