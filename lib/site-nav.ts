import { prisma } from "@/lib/prisma";
import { assertCorePublicNavPreserved } from "@/lib/truth/public-chrome";

import type { WorkPillarNavItem } from "@/lib/work-pillar-settings";

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
  /** Off by default; turn on under Admin → Website pages → Navigation. Same destination as Work unless you edit the URL. */
  { id: "projects", label: "Projects", href: "/work", visible: false },
  /** Driven by Admin → Design master toggle + showInNav; forced off when Design section is hidden. */
  { id: "design", label: "Design", href: "/design", visible: false },
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
  // Permanent lock: core public marketing nav labels/hrefs stay visible.
  return assertCorePublicNavPreserved(normalized);
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

/** Inserts pillar links immediately after the first Work hub item (`/work`), even when that hub is hidden. */
export function mergeWorkPillarNavIntoSiteNav(
  nav: SiteNavItem[],
  pillarLinks: WorkPillarNavItem[]
): SiteNavItem[] {
  if (!pillarLinks.length) return nav;
  const out: SiteNavItem[] = [];
  let inserted = false;
  for (const link of nav) {
    out.push(link);
    if (!inserted && isWorkHubNavItem(link)) {
      for (const p of pillarLinks) {
        out.push({
          id: `work_pillar_${p.slug}`,
          label: p.label,
          href: p.href,
          visible: true,
          cta: false,
        });
      }
      inserted = true;
    }
  }
  if (!inserted) {
    for (const p of pillarLinks) {
      out.push({
        id: `work_pillar_${p.slug}`,
        label: p.label,
        href: p.href,
        visible: true,
        cta: false,
      });
    }
  }
  return out;
}

function isWorkHubNavItem(link: SiteNavItem): boolean {
  if (link.id === "work" || link.id === "projects") return true;
  const raw = link.href.trim();
  if (!raw) return false;
  const pathOnly = raw.split("#")[0]?.split("?")[0] ?? raw;
  if (pathOnly.startsWith("http://") || pathOnly.startsWith("https://")) {
    try {
      const u = new URL(pathOnly);
      const path = u.pathname.replace(/\/+$/, "") || "/";
      return path === "/work";
    } catch {
      return false;
    }
  }
  const path = pathOnly.replace(/\/+$/, "") || "/";
  return path === "/work";
}

function navPathOnly(href: string): string {
  const raw = href.trim();
  if (!raw) return "";
  const pathOnly = raw.split("#")[0]?.split("?")[0] ?? raw;
  if (pathOnly.startsWith("http://") || pathOnly.startsWith("https://")) {
    try {
      return new URL(pathOnly).pathname.replace(/\/+$/, "") || "/";
    } catch {
      return pathOnly.replace(/\/+$/, "") || "/";
    }
  }
  return pathOnly.replace(/\/+$/, "") || "/";
}

function isAdvertisingNavItem(link: SiteNavItem): boolean {
  if (link.id === "work_pillar_advertising") return true;
  if (navPathOnly(link.href) === "/work/advertising") return true;
  return link.label.trim().toLowerCase() === "advertising";
}

function isContactNavItem(link: SiteNavItem): boolean {
  if (link.id === "contact") return true;
  return navPathOnly(link.href) === "/contact";
}

/**
 * Apply Design section master toggle + showInNav.
 * When live, Design is placed immediately after Advertising and before Contact.
 */
export function applyDesignNavToSiteNav(
  nav: SiteNavItem[],
  opts: { enabled: boolean; showInNav: boolean; navLabel: string }
): SiteNavItem[] {
  const visible = opts.enabled && opts.showInNav;
  const designItem: SiteNavItem = {
    id: "design",
    label: opts.navLabel || "Design",
    href: "/design",
    visible,
    cta: false,
  };

  const withoutDesign = nav.filter((item) => item.id !== "design");

  if (!visible) {
    // Keep a hidden Design entry so CMS nav editors still see the slot; park it before Contact when possible.
    const contactIdx = withoutDesign.findIndex(isContactNavItem);
    if (contactIdx >= 0) {
      const out = withoutDesign.slice();
      out.splice(contactIdx, 0, designItem);
      return out;
    }
    return [...withoutDesign, designItem];
  }

  const advertisingIdx = withoutDesign.findIndex(isAdvertisingNavItem);
  if (advertisingIdx >= 0) {
    const out = withoutDesign.slice();
    out.splice(advertisingIdx + 1, 0, designItem);
    return out;
  }

  const contactIdx = withoutDesign.findIndex(isContactNavItem);
  if (contactIdx >= 0) {
    const out = withoutDesign.slice();
    out.splice(contactIdx, 0, designItem);
    return out;
  }

  return [...withoutDesign, designItem];
}

