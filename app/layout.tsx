import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Inter, Montserrat } from "next/font/google";
import Providers from "./providers";
import Analytics from "../components/Analytics";
import { BRAND } from "@/lib/config/brand";
import AppShell from "./AppShell";
import { DEFAULT_SITE_THEME, getSiteTheme, themeToCssVars } from "@/lib/site-theme";
import { DEFAULT_SITE_NAV, getSiteNav, mergeWorkPillarNavIntoSiteNav } from "@/lib/site-nav";
import { getDefaultVisibleWorkPillarNavItems, getVisibleWorkPillarNavItems } from "@/lib/work-pillar-settings";
import "./globals.css";

export const dynamic = "force-dynamic";

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
  const [theme, nav, pillarNav] = await Promise.all([
    withTimeout(getSiteTheme(), DEFAULT_SITE_THEME),
    withTimeout(getSiteNav(), DEFAULT_SITE_NAV),
    withTimeout(getVisibleWorkPillarNavItems(), getDefaultVisibleWorkPillarNavItems()),
  ]);
  const mergedNav = mergeWorkPillarNavIntoSiteNav(nav, pillarNav);
  const themeStyle = themeToCssVars(theme) as CSSProperties;

  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="antialiased" style={themeStyle}>
        <Providers>
          <AppShell siteNav={mergedNav} siteTheme={theme}>{children}</AppShell>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
