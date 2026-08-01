/**
 * Public site chrome locks — permanent.
 * Do not change nav brand wording, core link set, or visual baseline tokens
 * without an explicit user request.
 */

export const PUBLIC_NAV_BRAND = Object.freeze({
  /** Primary word in the sticky header link. */
  primary: "BRIGHTLINE",
  /** Secondary word — smaller / lower opacity in Navbar. */
  secondary: "PHOTOGRAPHY",
  /** Do not place the wordmark PNG in the top nav. */
  wordmarkInTopNav: false as const,
  homeHref: "/" as const,
});

/** Core marketing nav that must remain available (labels + hrefs). */
export const CORE_PUBLIC_NAV = Object.freeze([
  Object.freeze({ id: "work", label: "Work", href: "/work" }),
  Object.freeze({ id: "galleries", label: "Galleries", href: "/galleries" }),
  Object.freeze({ id: "services", label: "Services", href: "/services" }),
  Object.freeze({ id: "about", label: "About", href: "/about" }),
  Object.freeze({ id: "contact", label: "Contact", href: "/contact" }),
] as const);

export type CorePublicNavId = (typeof CORE_PUBLIC_NAV)[number]["id"];

export const PUBLIC_VISUAL_BASELINE = Object.freeze({
  headerBgScrolled: "bg-[#0b0e12]/80",
  headerBgRest: "bg-[#0b0e12]/60",
  photographicBase: "dark charcoal / black",
  typography: "crisp white",
  accents: "fine-line / restrained warm glow",
});

type NavLike = { id: string; label: string; href: string; visible?: boolean };

/**
 * After CMS nav normalize, restore core public items’ frozen label/href and
 * force them visible. Optional CMS items (blog, design, projects) are untouched.
 */
export function assertCorePublicNavPreserved<T extends NavLike>(nav: T[]): T[] {
  const byId = new Map(nav.map((item) => [item.id, item]));
  const out = nav.slice();

  for (const core of CORE_PUBLIC_NAV) {
    const existing = byId.get(core.id);
    if (existing) {
      existing.label = core.label;
      existing.href = core.href;
      existing.visible = true;
    } else {
      out.push({
        id: core.id,
        label: core.label,
        href: core.href,
        visible: true,
      } as T);
    }
  }

  return out;
}
