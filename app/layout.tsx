import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Providers from "./providers";
import PageTransition from "../components/PageTransition";
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
  metadataBase: new URL("https://brightlinephotography.co"),
  title: "Bright Line Photography",
  description: "Commercial photography for hospitality, real estate, and fashion brands.",
  openGraph: {
    title: "Bright Line Photography",
    description:
      "Commercial photography for hospitality, real estate, and fashion brands.",
    url: "/",
    siteName: "Bright Line Photography",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Bright Line Photography",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bright Line Photography",
    description:
      "Commercial photography for hospitality, real estate, and fashion brands.",
    images: ["/og-image.svg"],
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
      </body>
    </html>
  );
}
