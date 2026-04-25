"use client";

import { usePathname } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageTransition from "../components/PageTransition";
import type { SiteTheme } from "@/lib/site-theme";
import type { SiteNavItem } from "@/lib/site-nav";

function isVideoUrl(url: string) {
  const decoded = decodeURIComponent(url);
  try {
    const parsed = new URL(decoded, "https://brightline.local");
    const key = parsed.searchParams.get("key") ?? "";
    return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(key || parsed.pathname);
  } catch {
    return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(decoded);
  }
}

function mediaUrl(input: string) {
  const value = input.trim();
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value) || value.startsWith("/")) return value;
  return `/api/media/public?key=${encodeURIComponent(value.replace(/^\/+/, ""))}`;
}

function SiteBackground({ theme }: { theme: SiteTheme }) {
  if (!theme.backgroundMediaEnabled || !theme.backgroundMediaUrl) return null;
  const src = mediaUrl(theme.backgroundMediaUrl);
  const poster = mediaUrl(theme.backgroundPosterUrl);
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {isVideoUrl(src) ? (
        <video
          src={src}
          poster={poster || undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="h-full w-full object-cover opacity-35"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover opacity-35" />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,9,11,0.55),rgba(7,9,11,0.88))]" />
    </div>
  );
}

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
