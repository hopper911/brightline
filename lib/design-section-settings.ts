import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  designCategoryLabel,
  normalizeDesignDisciplinesExpanded,
} from "@/lib/design/categories";

export const DESIGN_SECTION_SETTING_KEY = "design_section:v1";

export type DesignSectionSettings = {
  enabled: boolean;
  hubLabel: string;
  hubDescription: string;
  navLabel: string;
  showInNav: boolean;
  showOnHome: boolean;
  showOnWorkHub: boolean;
  showOnAbout: boolean;
  showInFooter: boolean;
};

export const DEFAULT_DESIGN_SECTION_SETTINGS: DesignSectionSettings = {
  enabled: false,
  hubLabel: "Design",
  hubDescription:
    "Selected product, UX, web, graphic-design, and automation work from Brightline’s design and digital practice.",
  navLabel: "Design",
  showInNav: true,
  showOnHome: true,
  showOnWorkHub: true,
  showOnAbout: true,
  showInFooter: true,
};

export const DESIGN_DISCIPLINES = [
  { id: "identity", label: "Identity" },
  { id: "print", label: "Print" },
  { id: "digital", label: "Digital" },
  { id: "packaging", label: "Packaging" },
] as const;

export type DesignDisciplineId = (typeof DESIGN_DISCIPLINES)[number]["id"];

function cleanString(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  const s = String(v).trim();
  return s || fallback;
}

export function normalizeDesignSectionSettings(input: unknown): DesignSectionSettings {
  const o = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    enabled: typeof o.enabled === "boolean" ? o.enabled : DEFAULT_DESIGN_SECTION_SETTINGS.enabled,
    hubLabel: cleanString(o.hubLabel, DEFAULT_DESIGN_SECTION_SETTINGS.hubLabel),
    hubDescription: cleanString(o.hubDescription, DEFAULT_DESIGN_SECTION_SETTINGS.hubDescription),
    navLabel: cleanString(o.navLabel, DEFAULT_DESIGN_SECTION_SETTINGS.navLabel),
    showInNav:
      typeof o.showInNav === "boolean" ? o.showInNav : DEFAULT_DESIGN_SECTION_SETTINGS.showInNav,
    showOnHome:
      typeof o.showOnHome === "boolean" ? o.showOnHome : DEFAULT_DESIGN_SECTION_SETTINGS.showOnHome,
    showOnWorkHub:
      typeof o.showOnWorkHub === "boolean"
        ? o.showOnWorkHub
        : DEFAULT_DESIGN_SECTION_SETTINGS.showOnWorkHub,
    showOnAbout:
      typeof o.showOnAbout === "boolean"
        ? o.showOnAbout
        : DEFAULT_DESIGN_SECTION_SETTINGS.showOnAbout,
    showInFooter:
      typeof o.showInFooter === "boolean"
        ? o.showInFooter
        : DEFAULT_DESIGN_SECTION_SETTINGS.showInFooter,
  };
}

export const getDesignSectionSettings = cache(async (): Promise<DesignSectionSettings> => {
  try {
    const row = await prisma.siteSetting.findUnique({
      where: { key: DESIGN_SECTION_SETTING_KEY },
      select: { value: true },
    });
    if (!row?.value) return { ...DEFAULT_DESIGN_SECTION_SETTINGS };
    return normalizeDesignSectionSettings(JSON.parse(row.value));
  } catch {
    return { ...DEFAULT_DESIGN_SECTION_SETTINGS };
  }
});

export async function isDesignSectionEnabled(): Promise<boolean> {
  const s = await getDesignSectionSettings();
  return s.enabled === true;
}

export async function saveDesignSectionSettings(
  input: unknown
): Promise<DesignSectionSettings> {
  const settings = normalizeDesignSectionSettings(input);
  await prisma.siteSetting.upsert({
    where: { key: DESIGN_SECTION_SETTING_KEY },
    update: { value: JSON.stringify(settings) },
    create: { key: DESIGN_SECTION_SETTING_KEY, value: JSON.stringify(settings) },
  });
  return settings;
}

export type DesignSpecimenBlock = {
  id: string;
  imageKey: string;
  caption: string;
  applicationLabel: string;
  sortOrder: number;
};

export function normalizeSpecimenBlocks(raw: unknown): DesignSpecimenBlock[] {
  if (!Array.isArray(raw)) return [];
  const out: DesignSpecimenBlock[] = [];
  raw.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const o = item as Record<string, unknown>;
    const imageKey = cleanString(o.imageKey);
    if (!imageKey) return;
    out.push({
      id: cleanString(o.id) || `block-${index + 1}`,
      imageKey,
      caption: cleanString(o.caption),
      applicationLabel: cleanString(o.applicationLabel),
      sortOrder:
        typeof o.sortOrder === "number" && Number.isFinite(o.sortOrder)
          ? Math.round(o.sortOrder)
          : index,
    });
  });
  return out.sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

export function normalizeDisciplines(raw: unknown): string[] {
  return normalizeDesignDisciplinesExpanded(raw);
}

export function disciplineLabel(id: string): string {
  return designCategoryLabel(id);
}
