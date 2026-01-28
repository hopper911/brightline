"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import MagneticButton from "./MagneticButton";

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
            className="font-display text-4xl md:text-6xl leading-[1.05] text-black heading-hover"
          >
            Editorial photography for brands that want quiet luxury and
            commercial clarity.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: "easeOut", delay: 0.2 }}
            className="text-base md:text-lg text-black/70"
          >
            Bright Line partners with hospitality, real estate, and lifestyle
            teams to deliver cinematic imagery, art direction, and visual
            systems that elevate every channel.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.35 }}
            className="flex flex-wrap gap-4"
          >
            <MagneticButton href="/contact" className="btn btn-primary">
              Book a Session
            </MagneticButton>
            <MagneticButton href="/#portfolio" className="btn btn-ghost">
              View Portfolio
            </MagneticButton>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.45 }}
            className="flex items-center gap-6 text-xs uppercase tracking-[0.32em] text-black/50"
          >
            <span>Miami</span>
            <span>New York</span>
            <span>Available Worldwide</span>
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
