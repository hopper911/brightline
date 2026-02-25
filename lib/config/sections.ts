import type { WorkSection } from "@prisma/client";

export const SECTION_SLUGS = ["acd", "rea", "cul", "biz", "tri"] as const;
export type SectionSlug = (typeof SECTION_SLUGS)[number];

export const SECTION_TITLES: Record<SectionSlug, string> = {
  acd: "Advertising & Campaign Development",
  rea: "Real Estate",
  cul: "Culture",
  biz: "Business Professional",
  tri: "Travel & Leisure",
};

export const SLUG_TO_SECTION: Record<SectionSlug, WorkSection> = {
  acd: "ACD",
  rea: "REA",
  cul: "CUL",
  biz: "BIZ",
  tri: "TRI",
};

export const SECTION_TO_SLUG: Record<WorkSection, SectionSlug> = {
  ACD: "acd",
  REA: "rea",
  CUL: "cul",
  BIZ: "biz",
  TRI: "tri",
};

export type SectionConfig = {
  slug: SectionSlug;
  title: string;
  description?: string;
  featuredReelId?: string;
};

export const SECTIONS: SectionConfig[] = SECTION_SLUGS.map((slug) => ({
  slug,
  title: SECTION_TITLES[slug],
  description: undefined,
  featuredReelId: undefined,
}));

export function isValidSectionSlug(value: string): value is SectionSlug {
  return SECTION_SLUGS.includes(value as SectionSlug);
}

export function slugToSection(slug: SectionSlug): WorkSection {
  return SLUG_TO_SECTION[slug];
}
