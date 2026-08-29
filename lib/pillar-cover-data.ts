import type { WorkSection } from "@prisma/client";
import {
  dualBrandMediaCardSrc,
  dualBrandMediaSrc,
  type DualBrandWorkProject,
} from "@/lib/dual-brand/content-api";
import { getFeaturedHeroMapForSections } from "@/lib/queries/work";
import { getPublicR2CardUrl, getPublicR2FullBleedUrl } from "@/lib/r2";
import {
  getVisibleWorkPillars,
  isDualBrandHub,
  type PillarConfig,
  resolvePillarCoverUrl,
} from "@/lib/work-pillar-settings";

export type PillarCoverRow = {
  slug: string;
  label: string;
  homeMeta: string;
  description?: string;
  coverUrl: string;
  /** Full-bleed tier for page backgrounds — not for listing cards. */
  coverBleedUrl: string;
  coverAlt: string;
  sections: WorkSection[];
  hub: PillarConfig["hub"];
};

function heroMediaCardUrl(media: { keyThumb?: string | null; keyFull?: string | null } | null): string {
  if (!media) return "";
  const key = media.keyThumb ?? media.keyFull ?? "";
  return key ? getPublicR2CardUrl(key) : "";
}

function heroMediaBleedUrl(media: { keyThumb?: string | null; keyFull?: string | null } | null): string {
  if (!media) return "";
  const key = media.keyFull ?? media.keyThumb ?? "";
  return key ? getPublicR2FullBleedUrl(key) : "";
}

function resolvePillarCoverCardUrl(
  coverKeyOrUrl: string | undefined | null,
  fallbackCardUrl: string | null
): string {
  const v = coverKeyOrUrl?.trim();
  if (!v) return fallbackCardUrl ?? "/images/hero.jpg";
  if (/^(https?:|\/)/i.test(v)) return v;
  const signed = getPublicR2CardUrl(v.replace(/^\/+/, ""));
  return signed || fallbackCardUrl ?? "/images/hero.jpg";
}

function resolvePillarCoverBleedUrl(
  coverKeyOrUrl: string | undefined | null,
  fallbackBleedUrl: string | null
): string {
  const v = coverKeyOrUrl?.trim();
  if (!v) return fallbackBleedUrl ?? "/images/hero.jpg";
  if (/^(https?:|\/)/i.test(v)) return v;
  return resolvePillarCoverUrl(v, fallbackBleedUrl) ?? fallbackBleedUrl ?? "/images/hero.jpg";
}

/**
 * Build pillar cover rows for home/work listing grids using one batched hero query.
 */
export async function buildVisiblePillarCovers(options: {
  dualBrandCoverCardFallback: string | null;
  dualBrandCoverBleedFallback: string | null;
}): Promise<PillarCoverRow[]> {
  const pillars = await getVisibleWorkPillars();
  const sectionKeys = pillars
    .filter((p) => !isDualBrandHub(p) && p.sections[0])
    .map((p) => p.sections[0]!);
  const heroMap = await getFeaturedHeroMapForSections(sectionKeys);

  return pillars.map((pillar) => {
    let autoCard = "/images/hero.jpg";
    let autoBleed = "/images/hero.jpg";
    let coverAltDefault = pillar.label;

    if (isDualBrandHub(pillar)) {
      if (options.dualBrandCoverCardFallback) {
        autoCard = options.dualBrandCoverCardFallback;
        autoBleed = options.dualBrandCoverBleedFallback ?? options.dualBrandCoverCardFallback;
      }
    } else {
      const firstSection = pillar.sections[0];
      const hero = firstSection ? heroMap.get(firstSection) : null;
      const card = heroMediaCardUrl(hero);
      const bleed = heroMediaBleedUrl(hero);
      if (card) autoCard = card;
      if (bleed) autoBleed = bleed;
      if (hero?.alt) coverAltDefault = hero.alt;
    }

    const coverUrl = resolvePillarCoverCardUrl(pillar.coverImageKey, autoCard);
    const coverBleedUrl = resolvePillarCoverBleedUrl(pillar.coverImageKey, autoBleed);
    const coverAlt = pillar.coverAlt.trim() ? pillar.coverAlt.trim() : coverAltDefault;

    return {
      slug: pillar.slug,
      label: pillar.label,
      homeMeta: pillar.homeMeta,
      description: pillar.description,
      coverUrl,
      coverBleedUrl,
      coverAlt,
      sections: pillar.sections,
      hub: pillar.hub,
    };
  });
}

export function dualBrandCoverFallbacks(projects: DualBrandWorkProject[]): {
  card: string | null;
  bleed: string | null;
} {
  const hero =
    projects.find((p) => p.heroImage || p.thumbnailImage)?.heroImage ||
    projects.find((p) => p.thumbnailImage)?.thumbnailImage ||
    null;
  if (!hero) return { card: null, bleed: null };
  return {
    card: dualBrandMediaCardSrc(hero) || null,
    bleed: dualBrandMediaSrc(hero) || null,
  };
}
