import { prisma } from "@/lib/prisma";

export type SiteTheme = {
  background: string;
  backgroundMuted: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  accentInk: string;
  bodyFont: string;
  displayFont: string;
  backgroundMediaEnabled: boolean;
  backgroundMediaUrl: string;
  backgroundPosterUrl: string;
  /** Stronger opacity / lighter scrim when a site background video is active. */
  backgroundCinematic: boolean;
  /** When true (default), page PageBackground media is suppressed while site video plays. */
  backgroundSuppressPageMedia: boolean;
  /** Optional image shown in the site-wide footer “Next step” CTA card. */
  footerCtaImageUrl: string;
};

export const SITE_THEME_SETTING_KEY = "site_theme:v1";

export const DEFAULT_SITE_THEME: SiteTheme = {
  background: "#07090b",
  backgroundMuted: "#0b0e12",
  surface: "#0f1319",
  surfaceAlt: "#141a22",
  text: "rgba(255, 255, 255, 0.92)",
  textMuted: "rgba(255, 255, 255, 0.7)",
  border: "rgba(255, 255, 255, 0.1)",
  accent: "#ffffff",
  accentInk: "#0b0e12",
  bodyFont: "inter",
  displayFont: "montserrat",
  backgroundMediaEnabled: false,
  backgroundMediaUrl: "",
  backgroundPosterUrl: "",
  backgroundCinematic: true,
  backgroundSuppressPageMedia: true,
  footerCtaImageUrl: "",
};

const FONT_STACKS: Record<string, string> = {
  inter: "var(--font-inter), system-ui, sans-serif",
  montserrat: "var(--font-montserrat), system-ui, sans-serif",
  system: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace",
};

function asString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function normalizeSiteTheme(input: unknown): SiteTheme {
  const row = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    background: asString(row.background, DEFAULT_SITE_THEME.background),
    backgroundMuted: asString(row.backgroundMuted, DEFAULT_SITE_THEME.backgroundMuted),
    surface: asString(row.surface, DEFAULT_SITE_THEME.surface),
    surfaceAlt: asString(row.surfaceAlt, DEFAULT_SITE_THEME.surfaceAlt),
    text: asString(row.text, DEFAULT_SITE_THEME.text),
    textMuted: asString(row.textMuted, DEFAULT_SITE_THEME.textMuted),
    border: asString(row.border, DEFAULT_SITE_THEME.border),
    accent: asString(row.accent, DEFAULT_SITE_THEME.accent),
    accentInk: asString(row.accentInk, DEFAULT_SITE_THEME.accentInk),
    bodyFont: FONT_STACKS[asString(row.bodyFont, DEFAULT_SITE_THEME.bodyFont)]
      ? asString(row.bodyFont, DEFAULT_SITE_THEME.bodyFont)
      : DEFAULT_SITE_THEME.bodyFont,
    displayFont: FONT_STACKS[asString(row.displayFont, DEFAULT_SITE_THEME.displayFont)]
      ? asString(row.displayFont, DEFAULT_SITE_THEME.displayFont)
      : DEFAULT_SITE_THEME.displayFont,
    backgroundMediaEnabled:
      typeof row.backgroundMediaEnabled === "boolean"
        ? row.backgroundMediaEnabled
        : DEFAULT_SITE_THEME.backgroundMediaEnabled,
    backgroundMediaUrl: asString(row.backgroundMediaUrl, DEFAULT_SITE_THEME.backgroundMediaUrl),
    backgroundPosterUrl: asString(row.backgroundPosterUrl, DEFAULT_SITE_THEME.backgroundPosterUrl),
    backgroundCinematic:
      typeof row.backgroundCinematic === "boolean"
        ? row.backgroundCinematic
        : DEFAULT_SITE_THEME.backgroundCinematic,
    backgroundSuppressPageMedia:
      typeof row.backgroundSuppressPageMedia === "boolean"
        ? row.backgroundSuppressPageMedia
        : DEFAULT_SITE_THEME.backgroundSuppressPageMedia,
    footerCtaImageUrl: asString(row.footerCtaImageUrl, DEFAULT_SITE_THEME.footerCtaImageUrl),
  };
}

export function themeToCssVars(theme: SiteTheme): Record<string, string> {
  return {
    "--color-bg": theme.background,
    "--color-bg-muted": theme.backgroundMuted,
    "--color-surface": theme.surface,
    "--color-surface-alt": theme.surfaceAlt,
    "--color-text": theme.text,
    "--color-text-muted": theme.textMuted,
    "--color-text-subtle": theme.textMuted,
    "--color-border": theme.border,
    "--color-border-strong": theme.border,
    "--color-accent": theme.accent,
    "--color-accent-ink": theme.accentInk,
    "--font-body": FONT_STACKS[theme.bodyFont] ?? FONT_STACKS.inter!,
    "--font-display": FONT_STACKS[theme.displayFont] ?? FONT_STACKS.montserrat!,
  };
}

export async function getSiteTheme(): Promise<SiteTheme> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: SITE_THEME_SETTING_KEY },
      select: { value: true },
    });
    if (!setting?.value) return DEFAULT_SITE_THEME;
    return normalizeSiteTheme(JSON.parse(setting.value));
  } catch {
    return DEFAULT_SITE_THEME;
  }
}

export async function saveSiteTheme(input: unknown): Promise<SiteTheme> {
  const theme = normalizeSiteTheme(input);
  await prisma.siteSetting.upsert({
    where: { key: SITE_THEME_SETTING_KEY },
    update: { value: JSON.stringify(theme) },
    create: { key: SITE_THEME_SETTING_KEY, value: JSON.stringify(theme) },
  });
  return theme;
}
