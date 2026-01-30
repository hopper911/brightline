"use client";

import Image from "next/image";
import Link from "next/link";
import { getImageModeForUrl } from "@/lib/image-utils";

const BLUR_DATA =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iNyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iI2U4ZTllYSIvPjwvc3ZnPg==";

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
  const mode = getImageModeForUrl(cover);
  return (
    <Link href={href} className="group block">
      <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-black/[0.02]">
        <Image
          src={cover}
          alt={alt}
          width={1400}
          height={900}
          data-image-mode={mode}
          sizes="(min-width: 1024px) 520px, (min-width: 768px) 45vw, 100vw"
          placeholder="blur"
          blurDataURL={BLUR_DATA}
          className="h-[340px] w-full object-cover transition-transform motion-slow motion-ease group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:transform-none"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent opacity-0 transition-opacity motion-med motion-ease group-hover:opacity-100 motion-reduce:transition-none" />

        <div className="pointer-events-none absolute bottom-5 left-5 right-5 opacity-0 translate-y-2 transition-all motion-fast motion-ease group-hover:opacity-100 group-hover:translate-y-0 motion-reduce:transition-none motion-reduce:transform-none motion-reduce:opacity-100">
          <div className="inline-flex rounded-full bg-white/90 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-black/70">
            {tag}
          </div>
          <div className="mt-3 text-white">
            <div className="text-lg font-light">{title}</div>
            <div className="mt-1 text-sm text-white/70">{meta}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
