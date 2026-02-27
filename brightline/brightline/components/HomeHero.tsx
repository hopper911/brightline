"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import MagneticButton from "./MagneticButton";
import PrimaryCTA from "./PrimaryCTA";
import { BRAND } from "@/lib/config/brand";

export default function HomeHero() {
  const mediaBase =
    process.env.NEXT_PUBLIC_MEDIA_URL ||
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/+$/, "") ||
    "";
  const heroKey =
    process.env.NEXT_PUBLIC_HERO_VIDEO_KEY || "videos/hero/intro-v1";

  const hero = useMemo(() => {
    const base = mediaBase.replace(/\/+$/, "");
    const key = heroKey.replace(/\/+$/, "");
    return {
      mp4: base ? `${base}/${key}.mp4` : "",
      webm: base ? `${base}/${key}.webm` : "",
      poster: base ? `${base}/${key}.poster.jpg` : "",
    };
  }, [mediaBase, heroKey]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaLayerRef = useRef<HTMLDivElement | null>(null);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) return;

    const v = videoRef.current;
    if (!v || !hero.mp4) return;

    const tryPlay = async () => {
      try {
        await v.play();
        setVideoReady(true);
      } catch {
        setVideoReady(false);
      }
    };

    const onLoaded = () => tryPlay();
    v.addEventListener("loadedmetadata", onLoaded);

    tryPlay();
    return () => v.removeEventListener("loadedmetadata", onLoaded);
  }, [hero.mp4]);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) return;

    const el = mediaLayerRef.current;
    if (!el) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = typeof window !== "undefined" ? window.scrollY || 0 : 0;
        const t = Math.min(y, 200);
        const translate = (t / 200) * 10;
        const scale = 1 + (t / 200) * 0.02;
        el.style.transform = `translate3d(0, ${translate}px, 0) scale(${scale})`;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const containerVariants = {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.1, delayChildren: 0.05 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
  };

  const hasVideo = Boolean(mediaBase && hero.mp4 && hero.poster);

  return (
    <section className="relative overflow-hidden">
      {/* Background: video (if configured) or gradient blobs */}
      <div className="absolute inset-0">
        {hasVideo ? (
          <div
            ref={mediaLayerRef}
            className="absolute inset-0 will-change-transform"
          >
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: hero.poster ? `url(${hero.poster})` : undefined }}
              aria-hidden
            />
            <video
              ref={videoRef}
              className={[
                "absolute inset-0 h-full w-full object-cover",
                "transition-opacity duration-300",
                videoReady ? "opacity-100" : "opacity-0",
              ].join(" ")}
              muted
              playsInline
              loop
              preload="metadata"
              poster={hero.poster || undefined}
              onCanPlay={() => setVideoReady(true)}
            >
              <source src={hero.webm || undefined} type="video/webm" />
              <source src={hero.mp4} type="video/mp4" />
            </video>
            <div
              className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/55"
              aria-hidden
            />
            <div
              className="absolute inset-0 [background:radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.18)_70%,rgba(0,0,0,0.35)_100%)]"
              aria-hidden
            />
            <div className="absolute -right-20 top-20 h-48 w-48 rounded-full bg-white/10 blur-2xl float-slow" />
            <div className="absolute left-20 bottom-10 h-56 w-56 rounded-full bg-white/10 blur-2xl float-slow" />
          </div>
        ) : (
          <>
            <div className="absolute -right-20 top-20 h-48 w-48 rounded-full bg-[#b2673f]/30 blur-2xl float-slow" />
            <div className="absolute left-20 bottom-10 h-56 w-56 rounded-full bg-[#233047]/20 blur-2xl float-slow" />
          </>
        )}
      </div>

      {/* Content */}
      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-16 pt-16 md:flex-row md:items-center md:pt-24">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="max-w-xl space-y-6"
        >
          <motion.p
            variants={item}
            className="text-xs uppercase tracking-[0.35em] text-white/70"
          >
            Bright Line Photography
          </motion.p>

          <motion.h1
            variants={{
              hidden: { opacity: 0, y: 22 },
              show: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.85, ease: "easeOut" },
              },
            }}
            className="font-display text-3xl leading-[1.05] text-white md:text-5xl heading-hover"
          >
            Editorial photography for brands that want quiet luxury and
            commercial clarity.
          </motion.h1>

          <motion.p
            variants={item}
            className="text-sm text-white/75 md:text-base"
          >
            Cinematic imagery and art direction for architecture, real estate,
            and brand campaigns.
          </motion.p>

          <motion.div
            variants={{
              hidden: { opacity: 0, y: 14 },
              show: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.6, ease: "easeOut" },
              },
            }}
            className="flex flex-wrap gap-4"
          >
            <MagneticButton href="/work" className="btn btn-primary">
              View work
            </MagneticButton>
            <PrimaryCTA service="general" className="btn btn-ghost" />
          </motion.div>

          <motion.div
            variants={{
              hidden: { opacity: 0, y: 10 },
              show: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.55, ease: "easeOut" },
              },
            }}
            className="flex items-center gap-6 text-xs uppercase tracking-[0.32em] text-white/60"
          >
            {BRAND.contact.locations.map((location) => (
              <span key={location}>{location}</span>
            ))}
          </motion.div>
        </motion.div>

        <div
          className="relative h-[420px] w-full max-w-xl md:block"
          aria-hidden
        />
      </div>

      {hasVideo && (
        <div className="pointer-events-none absolute bottom-10 left-10 hidden md:block">
          <div className="rounded-full border border-white/25 bg-white/10 px-5 py-3 text-xs uppercase tracking-[0.32em] text-white/80 backdrop-blur">
            2026 Portfolio
          </div>
        </div>
      )}
    </section>
  );
}
