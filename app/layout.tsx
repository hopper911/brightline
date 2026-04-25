import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Inter, Montserrat } from "next/font/google";
import Providers from "./providers";
import Analytics from "../components/Analytics";
import { BRAND } from "@/lib/config/brand";
import AppShell from "./AppShell";
import { getSiteTheme, themeToCssVars } from "@/lib/site-theme";
import { getSiteNav } from "@/lib/site-nav";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await getSiteTheme();
  const nav = await getSiteNav();
  const themeStyle = themeToCssVars(theme) as CSSProperties;

  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="antialiased" style={themeStyle}>
        <Providers>
          <AppShell siteNav={nav} siteTheme={theme}>{children}</AppShell>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
