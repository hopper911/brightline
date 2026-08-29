import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { headers } from "next/headers";
import { Inter, Montserrat } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Providers from "./providers";
import Analytics from "../components/Analytics";
import { BRAND } from "@/lib/config/brand";
import AppShell from "./AppShell";
import { DEFAULT_SITE_THEME, themeToCssVars } from "@/lib/site-theme";
import { applyDesignNavToSiteNav, mergeWorkPillarNavIntoSiteNav } from "@/lib/site-nav";
import { DEFAULT_DESIGN_SECTION_SETTINGS } from "@/lib/design-section-settings";
import {
  getPublicChromeBundle,
  PUBLIC_PAGE_REVALIDATE_SECONDS,
} from "@/lib/public-chrome-cache";
import "./globals.css";

export const revalidate = PUBLIC_PAGE_REVALIDATE_SECONDS;

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const chrome = await getPublicChromeBundle();
  const { theme, nav, pillarNav, designSettings, backgroundMedia } = chrome;
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
        <SpeedInsights />
      </body>
    </html>
  );
}
