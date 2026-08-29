import { unstable_cache } from "next/cache";
import { getCachedDualBrandWorkForPublic } from "@/lib/dual-brand/content-api";
import {
  DEFAULT_DESIGN_SECTION_SETTINGS,
  getDesignSectionSettings,
} from "@/lib/design-section-settings";
import { DEFAULT_SITE_NAV, getSiteNav } from "@/lib/site-nav";
import { DEFAULT_SITE_THEME, getSiteTheme } from "@/lib/site-theme";
import { resolveSiteBackgroundMedia } from "@/lib/site-background-videos";
import {
  getDefaultVisibleWorkPillarNavItems,
  getVisibleWorkPillarNavItems,
} from "@/lib/work-pillar-settings";

/** Tag for cross-request public chrome (nav, theme, pillars, design). */
export const PUBLIC_CHROME_CACHE_TAG = "public-chrome";

export const PUBLIC_PAGE_REVALIDATE_SECONDS = 60;

export type PublicChromeBundle = {
  theme: Awaited<ReturnType<typeof getSiteTheme>>;
  nav: Awaited<ReturnType<typeof getSiteNav>>;
  pillarNav: Awaited<ReturnType<typeof getVisibleWorkPillarNavItems>>;
  designSettings: Awaited<ReturnType<typeof getDesignSectionSettings>>;
  backgroundMedia: Awaited<ReturnType<typeof resolveSiteBackgroundMedia>>;
};

async function loadPublicChromeBundle(): Promise<PublicChromeBundle> {
  try {
    const [theme, nav, pillarNav, designSettings] = await Promise.all([
      getSiteTheme(),
      getSiteNav(),
      getVisibleWorkPillarNavItems(),
      getDesignSectionSettings(),
    ]);
    const backgroundMedia = await resolveSiteBackgroundMedia(theme);
    return { theme, nav, pillarNav, designSettings, backgroundMedia };
  } catch {
    const theme = DEFAULT_SITE_THEME;
    return {
      theme,
      nav: DEFAULT_SITE_NAV,
      pillarNav: getDefaultVisibleWorkPillarNavItems(),
      designSettings: DEFAULT_DESIGN_SECTION_SETTINGS,
      backgroundMedia: await resolveSiteBackgroundMedia(theme).catch(() => ({
        enabled: false,
        videoUrl: "",
        posterUrl: "",
        cinematic: false,
        source: "none" as const,
        videoId: null,
        title: null,
      })),
    };
  }
}

/** Cross-request cache for layout chrome — revalidated on admin CMS saves. */
export const getPublicChromeBundle = unstable_cache(
  loadPublicChromeBundle,
  ["public-chrome-bundle"],
  { revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS, tags: [PUBLIC_CHROME_CACHE_TAG] }
);

export async function getPublicDualBrandWork() {
  return getCachedDualBrandWorkForPublic();
}
