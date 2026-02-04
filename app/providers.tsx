"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { LazyMotion, domAnimation } from "framer-motion";
import Lenis from "lenis";

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.0,
    });

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <SessionProvider>
      <LazyMotion features={domAnimation}>{children}</LazyMotion>
    </SessionProvider>
  );
}
