import { cache } from "react";
import type { WorkSection } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildSectionToPillarMap,
  getPrimaryWorkSection,
  isReservedPillarSlug,
  isValidPillarSlugFormat,
  PILLARS,
  type PillarConfig,
} from "@/lib/portfolioPillars";
import { getPublicR2Url } from "@/lib/r2";

export const WORK_PILLARS_SETTING_KEY = "work_pillars:v1";

type WorkPillarsFileV2 = {
  version: 2;
  pillars: PillarConfig[];
};

function cleanString(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function sortPillars(list: PillarConfig[]): PillarConfig[] {
  return list
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug));
}

function isV2File(raw: unknown): raw is WorkPillarsFileV2 {
  return (
    !!raw &&
    typeof raw === "object" &&
    (raw as WorkPillarsFileV2).version === 2 &&
    Array.isArray((raw as WorkPillarsFileV2).pillars)
  );
}

/** v1: { architecture: { visible, label, ... }, ... } */
function migrateV1Overrides(row: Record<string, unknown>): WorkPillarsFileV2 {
  const pillars: PillarConfig[] = PILLARS.map((base) => {
    const raw = row[base.slug];
    if (!raw || typeof raw !== "object") {
      return { ...base };
    }
    const o = raw as Record<string, unknown>;
    return {
      ...base,
      visible: typeof o.visible === "boolean" ? o.visible : base.visible,
      label: cleanString(o.label) || base.label,
      homeMeta: cleanString(o.homeMeta) || base.homeMeta,
      description: cleanString(o.description) || base.description,
      coverImageKey: cleanString(o.coverImageKey),
      coverAlt: cleanString(o.coverAlt),
      sortOrder:
        typeof o.sortOrder === "number" && Number.isFinite(o.sortOrder)
          ? Math.round(o.sortOrder)
          : base.sortOrder,
    };
  });
  return { version: 2, pillars };
}

function parseStoredJson(value: string): WorkPillarsFileV2 {
  const parsed: unknown = JSON.parse(value);
  if (isV2File(parsed)) {
    return { version: 2, pillars: parsed.pillars.map((p) => ({ ...p })) };
  }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return migrateV1Overrides(parsed as Record<string, unknown>);
  }
  return { version: 2, pillars: PILLARS.map((p) => ({ ...p })) };
}

function parseSectionList(raw: unknown): WorkSection[] | null {
  if (!Array.isArray(raw)) return null;
  const out: WorkSection[] = [];
  const allowed = new Set<string>(["ACD", "REA", "CUL", "BIZ", "TRI"]);
  for (const x of raw) {
    const s = typeof x === "string" ? x.trim().toUpperCase() : "";
    if (!allowed.has(s)) return null;
    out.push(s as WorkSection);
  }
  return out;
}

export function normalizePillarConfig(raw: unknown, fallbackSort: number): PillarConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const slug = cleanString(o.slug).toLowerCase();
  if (!isValidPillarSlugFormat(slug) || isReservedPillarSlug(slug)) return null;

  const label = cleanString(o.label);
  const description = cleanString(o.description);
  const homeMeta = cleanString(o.homeMeta);
  if (!label || !description) return null;

  const sections = parseSectionList(o.sections);
  if (!sections || sections.length === 0) return null;

  const visible = typeof o.visible === "boolean" ? o.visible : true;
  const coverImageKey = cleanString(o.coverImageKey);
  const coverAlt = cleanString(o.coverAlt);
  const sortOrder =
    typeof o.sortOrder === "number" && Number.isFinite(o.sortOrder)
      ? Math.round(o.sortOrder)
      : fallbackSort;

  return {
    slug,
    label,
    description,
    homeMeta,
    sections,
    visible,
    coverImageKey,
    coverAlt,
    sortOrder,
  };
}

export function validatePillarList(pillars: PillarConfig[]): string | null {
  const slugs = new Set<string>();
  for (const p of pillars) {
    if (slugs.has(p.slug)) return `Duplicate pillar slug: ${p.slug}`;
    slugs.add(p.slug);
    if (!isValidPillarSlugFormat(p.slug) || isReservedPillarSlug(p.slug)) {
      return `Invalid reserved slug: ${p.slug}`;
    }
    if (!p.label.trim() || !p.description.trim()) return `Pillar ${p.slug} needs a label and description`;
    if (!p.sections.length) return `Pillar ${p.slug} needs at least one work section`;
  }
  try {
    buildSectionToPillarMap(pillars);
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid section mapping";
  }
  return null;
}

async function readWorkPillarsFileFromDb(): Promise<WorkPillarsFileV2> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: WORK_PILLARS_SETTING_KEY },
      select: { value: true },
    });
    if (!setting?.value?.trim()) {
      return { version: 2, pillars: PILLARS.map((p) => ({ ...p })) };
    }
    try {
      return parseStoredJson(setting.value);
    } catch {
      return { version: 2, pillars: PILLARS.map((p) => ({ ...p })) };
    }
  } catch {
    return { version: 2, pillars: PILLARS.map((p) => ({ ...p })) };
  }
}

/** Per-request cached full pillar list (includes hidden). */
export const getWorkPillarList = cache(async (): Promise<PillarConfig[]> => {
  const file = await readWorkPillarsFileFromDb();
  const normalized = file.pillars
    .map((p, i) => normalizePillarConfig(p, i) ?? null)
    .filter(Boolean) as PillarConfig[];
  if (normalized.length === 0) {
    return sortPillars(PILLARS.map((p) => ({ ...p })));
  }
  return sortPillars(normalized);
});

export async function getVisibleWorkPillars(): Promise<PillarConfig[]> {
  const list = await getWorkPillarList();
  return list.filter((p) => p.visible !== false);
}

export async function getPillarBySlug(slug: string): Promise<PillarConfig | null> {
  const key = slug.trim().toLowerCase();
  const list = await getWorkPillarList();
  return list.find((p) => p.slug === key) ?? null;
}

export async function isKnownPillarSlug(slug: string): Promise<boolean> {
  const p = await getPillarBySlug(slug);
  return p != null;
}

export async function getSectionToPillarSlugMap(): Promise<Record<WorkSection, string>> {
  const list = await getWorkPillarList();
  return buildSectionToPillarMap(list);
}

export async function sectionToPillarSlug(section: WorkSection): Promise<string> {
  const map = await getSectionToPillarSlugMap();
  const s = map[section];
  if (!s) throw new Error(`No pillar includes work section ${section}`);
  return s;
}

export function resolvePillarCoverUrl(
  coverKeyOrUrl: string | undefined | null,
  fallbackUrl: string | null
): string | null {
  const v = coverKeyOrUrl?.trim();
  if (!v) return fallbackUrl;
  if (/^(https?:|\/)/i.test(v)) return v;
  const signed = getPublicR2Url(v.replace(/^\/+/, ""));
  return signed || fallbackUrl;
}

export type WorkPillarNavItem = {
  slug: string;
  href: string;
  label: string;
};

export function getDefaultVisibleWorkPillarNavItems(): WorkPillarNavItem[] {
  return PILLARS.filter((p) => p.visible).map((p) => ({
    slug: p.slug,
    href: `/work/${p.slug}`,
    label: p.label,
  }));
}

export async function getVisibleWorkPillarNavItems(): Promise<WorkPillarNavItem[]> {
  const list = await getVisibleWorkPillars();
  return list.map((p) => ({
    slug: p.slug,
    href: `/work/${p.slug}`,
    label: p.label,
  }));
}

export async function saveWorkPillarList(pillars: PillarConfig[]): Promise<PillarConfig[]> {
  const err = validatePillarList(pillars);
  if (err) throw new Error(err);

  const normalized = sortPillars(
    pillars.map((p, i) => ({
      ...p,
      slug: p.slug.trim().toLowerCase(),
      sortOrder:
        typeof p.sortOrder === "number" && Number.isFinite(p.sortOrder) ? Math.round(p.sortOrder) : i,
    }))
  );

  const file: WorkPillarsFileV2 = { version: 2, pillars: normalized };
  await prisma.siteSetting.upsert({
    where: { key: WORK_PILLARS_SETTING_KEY },
    update: { value: JSON.stringify(file) },
    create: { key: WORK_PILLARS_SETTING_KEY, value: JSON.stringify(file) },
  });
  return normalized;
}

export { getPrimaryWorkSection };
