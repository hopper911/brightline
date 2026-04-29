"use client";

import { usePathname } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageTransition from "../components/PageTransition";
import SiteBackground from "../components/SiteBackground";
import type { SiteTheme } from "@/lib/site-theme";
import type { SiteNavItem } from "@/lib/site-nav";

export default function AppShell({
  children,
  siteNav,
  siteTheme,
}: {
  children: React.ReactNode;
  siteNav: SiteNavItem[];
  siteTheme: SiteTheme;
}) {
  const pathname = usePathname();
  const isOperatorRoute =
    pathname?.startsWith("/admin") || pathname?.startsWith("/studio");

  if (isOperatorRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteBackground theme={siteTheme} />
      <div className="relative z-10">
        <Navbar links={siteNav} />
        <PageTransition>{children}</PageTransition>
        <Footer />
      </div>
    </>
  );
}
