"use client";

import { usePathname } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageTransition from "../components/PageTransition";
import SiteBackgroundLayer from "../components/SiteBackground";
import ImageProtection from "../components/ImageProtection";
import type { SiteTheme } from "@/lib/site-theme";
import type { SiteNavItem } from "@/lib/site-nav";
import type { ResolvedSiteBackgroundMedia } from "@/lib/site-background-videos";

function isPrivateDeliveryRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/client") ||
    pathname.startsWith("/package") ||
    pathname.startsWith("/delivery") ||
    pathname.startsWith("/final-package")
  );
}

export default function AppShell({
  children,
  siteNav,
  siteTheme,
  backgroundMedia,
  designFooter = null,
}: {
  children: React.ReactNode;
  siteNav: SiteNavItem[];
  siteTheme: SiteTheme;
  backgroundMedia: ResolvedSiteBackgroundMedia;
  designFooter?: { label: string; href: string } | null;
}) {
  const pathname = usePathname();
  const isOperatorRoute =
    pathname?.startsWith("/admin") || pathname?.startsWith("/studio") || pathname?.startsWith("/accountant");
  const isPrivateDelivery = isPrivateDeliveryRoute(pathname);

  if (isOperatorRoute) {
    return <>{children}</>;
  }

  if (isPrivateDelivery) {
    return (
      <div className="relative z-10 min-h-dvh bg-[#0b0e12]">
        <ImageProtection />
        <main id="main-content">{children}</main>
      </div>
    );
  }

  return (
    <SiteBackgroundLayer
      media={backgroundMedia}
      suppressPageMedia={siteTheme.backgroundSuppressPageMedia}
    >
      <ImageProtection />
      <div className="relative z-10">
        <Navbar links={siteNav} />
        <main id="main-content">
          <PageTransition>{children}</PageTransition>
        </main>
        <Footer designLink={designFooter} ctaImageUrl={siteTheme.footerCtaImageUrl} />
      </div>
    </SiteBackgroundLayer>
  );
}
