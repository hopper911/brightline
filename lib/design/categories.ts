/** Extended filter tags for Design & Digital (stored in disciplines string[]). */
export const DESIGN_LEGACY_DISCIPLINES = [
  { id: "identity", label: "Identity" },
  { id: "print", label: "Print" },
  { id: "digital", label: "Digital" },
  { id: "packaging", label: "Packaging" },
] as const;

export const DESIGN_PORTFOLIO_CATEGORIES = [
  { id: "product", label: "Product" },
  { id: "ux-ui", label: "UX/UI" },
  { id: "graphic", label: "Graphic Design" },
  { id: "web", label: "Web" },
  { id: "ai-automation", label: "AI & Automation" },
  ...DESIGN_LEGACY_DISCIPLINES,
] as const;

export type DesignPortfolioCategoryId = (typeof DESIGN_PORTFOLIO_CATEGORIES)[number]["id"];

const CATEGORY_IDS = new Set(DESIGN_PORTFOLIO_CATEGORIES.map((c) => c.id));

export function isDesignPortfolioCategory(value: string): value is DesignPortfolioCategoryId {
  return CATEGORY_IDS.has(value as DesignPortfolioCategoryId);
}

export function designCategoryLabel(id: string): string {
  const hit = DESIGN_PORTFOLIO_CATEGORIES.find((c) => c.id === id);
  return hit?.label ?? id;
}

export function filterProjectsByCategory<T extends { disciplines: string[] }>(
  projects: T[],
  category?: string | null
): T[] {
  if (!category || category === "all") return projects;
  return projects.filter((p) => p.disciplines.includes(category));
}

export function normalizeDesignDisciplinesExpanded(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const item of input) {
    if (typeof item !== "string") continue;
    const id = item.trim().toLowerCase();
    if (!id || !CATEGORY_IDS.has(id as DesignPortfolioCategoryId)) continue;
    if (!out.includes(id)) out.push(id);
  }
  return out;
}
