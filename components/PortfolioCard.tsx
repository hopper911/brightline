"use client";

import Image from "next/image";
import Link from "next/link";
import { m } from "framer-motion";

export default function PortfolioCard({
  href,
  cover,
  alt,
  tag,
  title,
  meta,
}: {
  href: string;
  cover: string;
  alt: string;
  tag: string;
  title: string;
  meta: string;
}) {
  return (
    <Link href={href} className="group block">
      <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-black/[0.02]">
        <Image
          src={cover}
          alt={alt}
          width={1400}
          height={900}
          className="h-[340px] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        <m.div
          initial={{ opacity: 0, y: 10 }}
          whileHover={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="pointer-events-none absolute bottom-5 left-5 right-5"
        >
          <div className="inline-flex rounded-full bg-white/90 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-black/70">
            {tag}
          </div>
          <div className="mt-3 text-white">
            <div className="text-lg font-light">{title}</div>
            <div className="mt-1 text-sm text-white/70">{meta}</div>
          </div>
        </m.div>
      </div>
    </Link>
  );
}
