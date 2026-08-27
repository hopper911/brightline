import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { headers } from "next/headers";
import { Inter, Montserrat } from "next/font/google";
import Providers from "./providers";
import Analytics from "../components/Analytics";
import { BRAND } from "@/lib/config/brand";
import AppShell from "./AppShell";
import { DEFAULT_SITE_THEME, getSiteTheme, themeToCssVars } from "@/lib/site-theme";
import { resolveSiteBackgroundMedia } from "@/lib/site-background-videos";
import { DEFAULT_SITE_NAV, getSiteNav, mergeWorkPillarNavIntoSiteNav, applyDesignNavToSiteNav } from "@/lib/site-nav";
import { getDefaultVisibleWorkPillarNavItems, getVisibleWorkPillarNavItems } from "@/lib/work-pillar-settings";
import { getDesignSectionSettings, DEFAULT_DESIGN_SECTION_SETTINGS } from "@/lib/design-section-settings";
import "./globals.css";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0e12",
};

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  manifest: "/site.webmanifest",
  verification: {
    google: "Z7v0cfsgPY26PiHlwc4YeKDnA_rD7psqd-QxXMo6WIo",
  },
  alternates: {
    canonical: "/",
  },
  title: BRAND.name,
  description: BRAND.metadata.description,
  openGraph: {
    title: BRAND.name,
    description: BRAND.metadata.description,
    url: "/",
    siteName: BRAND.name,
    images: [
      {
        url: BRAND.metadata.ogImage,
        width: 1200,
        height: 630,
        alt: BRAND.name,
      },
    ],
    type: "website",
  },
  twitter: {
    card: BRAND.metadata.twitterCard,
    title: BRAND.name,
    description: BRAND.metadata.description,
    images: [BRAND.metadata.ogImage],
  },
  icons: {
    icon: [
      { url: BRAND.assets.monogram, type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: BRAND.assets.monogram, sizes: "512x512", type: "image/png" }],
  },
};

async function withTimeout<T>(promise: Promise<T>, fallback: T, timeoutMs = 1500): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  /** Rejections must not crash the tree (e.g. DB errors in getVisibleWorkPillarNavItems). */
  const settled = promise.then(
    (v) => v,
    () => fallback
  );
  try {
    return await Promise.race([
      settled,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [theme, nav, pillarNav, designSettings] = await Promise.all([
    withTimeout(getSiteTheme(), DEFAULT_SITE_THEME),
    withTimeout(getSiteNav(), DEFAULT_SITE_NAV),
    withTimeout(getVisibleWorkPillarNavItems(), getDefaultVisibleWorkPillarNavItems()),
    withTimeout(getDesignSectionSettings(), DEFAULT_DESIGN_SECTION_SETTINGS),
  ]);
  const backgroundMedia = await withTimeout(resolveSiteBackgroundMedia(theme), {
    enabled: false,
    videoUrl: "",
    posterUrl: "",
    cinematic: false,
    source: "none" as const,
    videoId: null,
    title: null,
  });
  const mergedNav = applyDesignNavToSiteNav(
    mergeWorkPillarNavIntoSiteNav(nav, pillarNav),
    {
      enabled: designSettings.enabled,
      showInNav: designSettings.showInNav,
      navLabel: designSettings.navLabel,
    }
  );
  const themeStyle = themeToCssVars(theme) as CSSProperties;
  const designFooter =
    designSettings.enabled && designSettings.showInFooter
      ? { label: designSettings.navLabel || "Design", href: "/design" as const }
      : null;
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="antialiased" style={themeStyle}>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <Providers>
          <AppShell
            siteNav={mergedNav}
            siteTheme={theme}
            backgroundMedia={backgroundMedia}
            designFooter={designFooter}
          >
            {children}
          </AppShell>
        </Providers>
        <Analytics nonce={nonce} />
      </body>
    </html>
  );
}
