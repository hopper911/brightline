import type { Metadata } from "next";
import localFont from "next/font/local";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Providers from "./providers";
import PageTransition from "../components/PageTransition";
import Analytics from "../components/Analytics";
import { BRAND } from "@/lib/config/brand";
import "./globals.css";

const inter = localFont({
  src: [
    {
      path: "../node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/inter/files/inter-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/inter/files/inter-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-inter",
  display: "swap",
});

const montserrat = localFont({
  src: [
    {
      path: "../node_modules/@fontsource/montserrat/files/montserrat-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/montserrat/files/montserrat-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/montserrat/files/montserrat-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="antialiased">
        <Providers>
          <Navbar />
          <PageTransition>{children}</PageTransition>
          <Footer />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
