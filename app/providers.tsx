"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { LazyMotion, domAnimation } from "framer-motion";
import Lenis from "lenis";

/**
 * PERMANENT LOCK — admin sidebar scroll (do not touch).
 *
 * Lenis captures document wheel events and breaks nested overflow scroll on the
 * admin left rail (`.admin-nav-scroll`). Operator routes must keep native scroll.
 * See also: AdminNav.tsx, globals.css “ADMIN SIDEBAR SCROLL — LOCKED”,
 * and `.cursor/rules/admin-sidebar-scroll.mdc`.
 */
function isOperatorRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/accountant")
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const operator = isOperatorRoute(pathname);

    // Entering operator routes: tear down Lenis so native sidebar scroll works.
    if (operator) {
      if (lenisRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
        lenisRef.current.destroy();
        lenisRef.current = null;
      }
      return;
    }

    // Public routes: keep ONE Lenis instance across navigations.
    // Recreating on every pathname made each click feel like a full new page.
    if (!lenisRef.current) {
      const lenis = new Lenis({
        duration: 1.1,
        smoothWheel: true,
        wheelMultiplier: 0.9,
        touchMultiplier: 1.0,
      });
      lenisRef.current = lenis;

      const loop = (time: number) => {
        lenis.raf(time);
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    }

    lenisRef.current.scrollTo(0, { immediate: true });
  }, [pathname]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      lenisRef.current?.destroy();
      lenisRef.current = null;
    };
  }, []);

  return (
    <SessionProvider>
      <LazyMotion features={domAnimation}>{children}</LazyMotion>
    </SessionProvider>
  );
}
