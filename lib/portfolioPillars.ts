import type { WorkSection } from "@prisma/client";

export const PILLAR_SLUGS = ["campaign", "spaces", "corporate"] as const;
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
    slug: "campaign",
    label: "Campaign & Advertising",
    description:
      "Editorial campaigns, brand storytelling, and cultural projects for agencies and brands.",
    sections: ["ACD", "CUL"],
  },
  {
    slug: "spaces",
    label: "Hospitality & Spaces",
    description:
      "Real estate, hospitality, and travel imagery for properties and destinations.",
    sections: ["REA", "TRI"],
  },
  {
    slug: "corporate",
    label: "Corporate & Professional",
    description:
      "Workplace, executive, and professional imagery for businesses and organizations.",
    sections: ["BIZ"],
  },
];

export function getPillarBySlug(slug: string): PillarConfig | null {
  return PILLARS.find((p) => p.slug === slug) ?? null;
}

export function isPillarSlug(value: string): value is PillarSlug {
  return PILLAR_SLUGS.includes(value as PillarSlug);
}
