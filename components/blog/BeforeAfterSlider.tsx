"use client";

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { BlogBeforeAfter } from "@/lib/blog-post-model";

type Props = {
  section: BlogBeforeAfter;
  className?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function BeforeAfterSlider({ section, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPosition(clamp(next, 0, 100));
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
      updateFromClientX(event.clientX);
    },
    [updateFromClientX]
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      updateFromClientX(event.clientX);
    },
    [dragging, updateFromClientX]
  );

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
    setDragging(false);
  }, []);

  const beforeLabel = section.beforeLabel.trim() || "Before";
  const afterLabel = section.afterLabel.trim() || "After";
  const caption = section.caption.trim();

  return (
    <figure className={className}>
      <div
        ref={containerRef}
        className="relative aspect-[16/10] w-full touch-none select-none overflow-hidden rounded-2xl border border-white/10 bg-black image-guard-overlay"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="img"
        aria-label={`${beforeLabel} and ${afterLabel} comparison`}
      >
        {/* After (base layer) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={section.afterImageUrl}
          alt={section.afterImageAlt || afterLabel}
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* Before (clipped from the left) */}
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={section.beforeImageUrl}
            alt={section.beforeImageAlt || beforeLabel}
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>

        {/* Labels */}
        <span
          className={`pointer-events-none absolute left-3 top-3 rounded-md border border-white/15 bg-black/55 px-2.5 py-1 text-[0.62rem] font-medium uppercase tracking-[0.22em] text-white/90 backdrop-blur-sm transition-opacity ${
            position < 8 ? "opacity-0" : "opacity-100"
          }`}
        >
          {beforeLabel}
        </span>
        <span
          className={`pointer-events-none absolute right-3 top-3 rounded-md border border-white/20 bg-white/90 px-2.5 py-1 text-[0.62rem] font-medium uppercase tracking-[0.22em] text-black transition-opacity ${
            position > 92 ? "opacity-0" : "opacity-100"
          }`}
        >
          {afterLabel}
        </span>

        {/* Divider + handle */}
        <div
          className="pointer-events-none absolute inset-y-0 z-10"
          style={{ left: `${position}%` }}
        >
          <div className="absolute inset-y-0 -translate-x-1/2 border-l border-white/85" />
          <div
            className={`absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white text-black shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-transform ${
              dragging ? "scale-105" : ""
            }`}
            aria-hidden
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <path d="M6.5 4.5 3 9l3.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M11.5 4.5 15 9l-3.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Accessible range control */}
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(position)}
          onChange={(event) => setPosition(Number(event.target.value))}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label="Compare before and after"
          className="absolute inset-x-0 bottom-3 z-20 mx-auto h-2 w-[72%] cursor-ew-resize appearance-none bg-transparent opacity-0"
        />
      </div>

      {caption ? (
        <figcaption className="mt-4 text-sm leading-relaxed text-white/70">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
