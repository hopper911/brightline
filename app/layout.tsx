import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Providers from "./providers";
import PageTransition from "../components/PageTransition";
import Analytics from "../components/Analytics";
import { BRAND } from "@/lib/config/brand";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const montserrat = Montserrat({
  subsets: ["latin"],
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
