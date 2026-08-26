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
  showDesignPath?: boolean;
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

export default function HomeHero({ featuredImage = null, showDesignPath = false }: HomeHeroProps) {
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
          <motion.p initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
            <span className="text-xs uppercase tracking-[0.35em] text-white/65">{BRAND.name}</span>
          </motion.p>
          <motion.h1
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.05 }}
          >
            <span className="font-display text-3xl md:text-5xl leading-[1.05] text-white heading-hover">
              Visuals designed to perform.
            </span>
          </motion.h1>
          <motion.p
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          >
            <span className="text-sm md:text-base text-white/80">
              Premium photography with structured delivery—assets prepared for web, search, and social, not just the
              shoot.
            </span>
          </motion.p>
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.15 }}
          >
            <div className="btn-row">
              <MagneticButton href="/work" className="btn btn-primary">
                {showDesignPath ? "View Photography" : "View work"}
              </MagneticButton>
              {showDesignPath ? (
                <MagneticButton href="/design" className="btn btn-ghost">
                  Explore Design Work
                </MagneticButton>
              ) : (
                <PrimaryCTA service="general" className="btn btn-ghost">
                  Discuss a project
                </PrimaryCTA>
              )}
            </div>
          </motion.div>
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.2 }}
          >
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.65rem] uppercase tracking-[0.22em] text-white/60 sm:tracking-[0.28em]">
              {BRAND.contact.locations.map((location) => (
                <span key={location} className="whitespace-nowrap">
                  {location}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
        <motion.div
          style={{ scale }}
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.1 }}
        >
          <div className="relative h-[min(420px,70vw)] w-full max-w-xl overflow-hidden rounded-[32px] border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.45)] image-guard-overlay">
          {videoUrl ? (
            <>
              <video
                src={videoUrl}
                poster={posterUrl ?? featuredImage?.url ?? undefined}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
                aria-hidden
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              {featuredImage ? (
                <Link
                  href="/work"
                  className="absolute bottom-6 left-6 block h-20 w-20 overflow-hidden rounded-xl border border-white/40 shadow-lg ring-1 ring-black/5 transition-transform hover:scale-[1.02] image-guard-overlay"
                  aria-label="Featured work"
                >
                  <Image
                    src={featuredImage.url}
                    alt={featuredImage.alt}
                    fill
                    draggable={false}
                    sizes="80px"
                    className="object-cover"
                  />
                </Link>
              ) : null}
            </>
          ) : featuredImage ? (
            <Link
              href="/work"
              className="absolute inset-0 block image-guard-overlay"
              aria-label="Featured work"
            >
              <Image
                src={featuredImage.url}
                alt={featuredImage.alt}
                fill
                draggable={false}
                priority
                sizes="(min-width: 1024px) 520px, 100vw"
                className="object-cover image-fade"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </Link>
          ) : (
            <>
              <Image
                src="/images/hero.jpg"
                alt="BRIGHTLINE signature imagery"
                fill
                draggable={false}
                priority
                sizes="(min-width: 1024px) 520px, 100vw"
                placeholder="blur"
                blurDataURL={BLUR_DATA}
                className="object-cover image-fade"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </>
          )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
