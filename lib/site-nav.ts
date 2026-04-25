import { prisma } from "@/lib/prisma";

export type SiteNavItem = {
  id: string;
  label: string;
  href: string;
  visible: boolean;
  cta?: boolean;
};

export const SITE_NAV_SETTING_KEY = "site_nav:v1";

export const DEFAULT_SITE_NAV: SiteNavItem[] = [
  { id: "work", label: "Work", href: "/work", visible: true },
  { id: "galleries", label: "Galleries", href: "/galleries", visible: true },
  { id: "services", label: "Services", href: "/services", visible: true },
  { id: "about", label: "About", href: "/about", visible: true },
  { id: "contact", label: "Contact", href: "/contact", visible: true },
  { id: "blog", label: "Blog", href: "/blog", visible: false },
];

function cleanHref(value: unknown) {
  const href = typeof value === "string" ? value.trim() : "";
  if (!href) return "";
  if (href.startsWith("/") || href.startsWith("https://") || href.startsWith("http://")) {
    return href;
  }
  return `/${href.replace(/^\/+/, "")}`;
}

export function normalizeSiteNav(input: unknown): SiteNavItem[] {
  const source = Array.isArray(input) ? input : DEFAULT_SITE_NAV;
  const normalized = source
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const fallback = DEFAULT_SITE_NAV[index];
      const id =
        typeof row.id === "string" && row.id.trim()
          ? row.id.trim().replace(/[^a-zA-Z0-9_-]+/g, "-")
          : fallback?.id ?? `nav-${index + 1}`;
      const label =
        typeof row.label === "string" && row.label.trim()
          ? row.label.trim()
          : fallback?.label ?? "Nav item";
      const href = cleanHref(row.href) || fallback?.href || "/";
      return {
        id,
        label,
        href,
        visible: typeof row.visible === "boolean" ? row.visible : Boolean(fallback?.visible),
        cta: typeof row.cta === "boolean" ? row.cta : Boolean(fallback?.cta),
      };
    })
    .filter(Boolean) as SiteNavItem[];

  for (const fallback of DEFAULT_SITE_NAV) {
    if (!normalized.some((item) => item.id === fallback.id)) {
      normalized.push(fallback);
    }
  }
  return normalized;
}

export async function getSiteNav(): Promise<SiteNavItem[]> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: SITE_NAV_SETTING_KEY },
      select: { value: true },
    });
    if (!setting?.value) return DEFAULT_SITE_NAV;
    return normalizeSiteNav(JSON.parse(setting.value));
  } catch {
    return DEFAULT_SITE_NAV;
  }
}

export async function saveSiteNav(input: unknown): Promise<SiteNavItem[]> {
  const nav = normalizeSiteNav(input);
  await prisma.siteSetting.upsert({
    where: { key: SITE_NAV_SETTING_KEY },
    update: { value: JSON.stringify(nav) },
    create: { key: SITE_NAV_SETTING_KEY, value: JSON.stringify(nav) },
  });
  return nav;
}
