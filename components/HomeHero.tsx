"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import MagneticButton from "./MagneticButton";
import PrimaryCTA from "./PrimaryCTA";
import { BRAND } from "@/lib/config/brand";
import { getPublicR2Url } from "@/lib/r2";

type HomeHeroProps = {
  featuredImage?: { url: string; alt: string } | null;
};

const BLUR_DATA =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iNyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iI2U4ZTllYSIvPjwvc3ZnPg==";

function getHeroVideoUrl(): string | null {
  const key =
    typeof process.env.NEXT_PUBLIC_HERO_VIDEO_KEY === "string"
      ? process.env.NEXT_PUBLIC_HERO_VIDEO_KEY.trim()
      : "";
  return key ? getPublicR2Url(key) : null;
}

function getHeroPosterUrl(): string | null {
  const key =
    typeof process.env.NEXT_PUBLIC_HERO_POSTER_KEY === "string"
      ? process.env.NEXT_PUBLIC_HERO_POSTER_KEY.trim()
      : "";
  return key ? getPublicR2Url(key) : null;
}

export default function HomeHero({ featuredImage = null }: HomeHeroProps) {
  const videoUrl = getHeroVideoUrl();
  const posterUrl = getHeroPosterUrl();

  const { scrollY } = useScroll();
  const scale = useTransform(scrollY, [0, 200], [1, 1.03]);

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute -right-20 top-20 h-48 w-48 rounded-full bg-[#b2673f]/30 blur-2xl float-slow" />
        <div className="absolute left-20 bottom-10 h-56 w-56 rounded-full bg-[#233047]/20 blur-2xl float-slow" />
      </div>
      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-16 pt-16 md:flex-row md:items-center md:pt-24">
        <div className="max-w-xl space-y-6">
          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-xs uppercase tracking-[0.35em] text-black/60"
          >
            Bright Line Photography
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: "easeOut", delay: 0.1 }}
            className="font-display text-3xl md:text-5xl leading-[1.05] text-black heading-hover"
          >
            Editorial photography for brands that want quiet luxury and
            commercial clarity.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: "easeOut", delay: 0.2 }}
            className="text-sm md:text-base text-black/70"
          >
            Cinematic imagery and art direction for architecture, real estate,
            and brand campaigns.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.35 }}
            className="flex flex-wrap gap-4"
          >
            <MagneticButton href="/work" className="btn btn-primary">
              View work
            </MagneticButton>
            <PrimaryCTA service="general" className="btn btn-ghost" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.45 }}
            className="flex items-center gap-6 text-xs uppercase tracking-[0.32em] text-black/50"
          >
            {BRAND.contact.locations.map((location) => (
              <span key={location}>{location}</span>
            ))}
          </motion.div>
        </div>
        <motion.div
          style={{ scale }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
          className="relative h-[420px] w-full max-w-xl overflow-hidden rounded-[32px] border border-black/10 shadow-[0_30px_80px_rgba(27,26,23,0.18)]"
        >
          {videoUrl ? (
            <>
              <video
                src={videoUrl}
                poster={posterUrl ?? undefined}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
                aria-hidden
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            </>
          ) : (
            <>
              <Image
                src="/images/hero.jpg"
                alt="Bright Line signature imagery"
                fill
                priority
                sizes="(min-width: 1024px) 520px, 100vw"
                placeholder="blur"
                blurDataURL={BLUR_DATA}
                className="object-cover image-fade"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </>
          )}
          {featuredImage ? (
            <Link
              href="/work"
              className="absolute bottom-6 left-6 block h-20 w-20 overflow-hidden rounded-xl border border-white/40 shadow-lg ring-1 ring-black/5 transition-transform hover:scale-[1.02]"
            >
              <Image
                src={featuredImage.url}
                alt={featuredImage.alt}
                fill
                sizes="80px"
                className="object-cover"
              />
            </Link>
          ) : null}
        </motion.div>
      </div>
    </section>
  );
}
