"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import MagneticButton from "./MagneticButton";
import PrimaryCTA from "./PrimaryCTA";
import { BRAND } from "@/lib/config/brand";

const BLUR_DATA =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iNyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iI2U4ZTllYSIvPjwvc3ZnPg==";

export default function HomeHero() {
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
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
          className="relative h-[420px] w-full max-w-xl overflow-hidden rounded-[32px] border border-black/10 shadow-[0_30px_80px_rgba(27,26,23,0.18)]"
        >
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
          <div className="absolute bottom-6 left-6 rounded-full border border-white/40 bg-white/80 px-5 py-3 text-xs uppercase tracking-[0.32em] text-black">
            2026 Portfolio
          </div>
        </motion.div>
      </div>
    </section>
  );
}
