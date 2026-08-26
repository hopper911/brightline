"use client";

import {
  useCallback,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Image from "next/image";

export type ImageCarouselSlide = {
  src: string;
  alt: string;
  width?: number | null;
  height?: number | null;
};

type Props = {
  slides: ImageCarouselSlide[];
  /** Opens lightbox / zoom on stage click (arrows/swipe still navigate). */
  onSlideClick?: (index: number) => void;
  className?: string;
  defaultAspect?: string;
  sizes?: string;
};

const BLUR_DATA =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iNyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iI2U4ZTllYSIvPjwvc3ZnPg==";

const SWIPE_PX = 40;

function padIndex(n: number) {
  return String(n).padStart(2, "0");
}

function aspectStyle(
  width?: number | null,
  height?: number | null,
  fallback = "16 / 10"
): CSSProperties {
  if (width && height && width > 0 && height > 0) {
    return { aspectRatio: `${width} / ${height}` };
  }
  return { aspectRatio: fallback };
}

function isControlTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("button, a, [data-carousel-control]"));
}

export default function ImageCarousel({
  slides,
  onSlideClick,
  className = "",
  defaultAspect = "16 / 10",
  sizes = "(min-width: 1280px) 1100px, 100vw",
}: Props) {
  const labelId = useId();
  const [index, setIndex] = useState(0);
  const dragRef = useRef<{ x: number; y: number; tracking: boolean; swiped: boolean }>({
    x: 0,
    y: 0,
    tracking: false,
    swiped: false,
  });

  const count = slides.length;
  const safeIndex = count === 0 ? 0 : ((index % count) + count) % count;
  const active = slides[safeIndex];

  const go = useCallback(
    (next: number) => {
      if (count <= 1) return;
      setIndex(((next % count) + count) % count);
    },
    [count]
  );

  const prev = useCallback(() => go(safeIndex - 1), [go, safeIndex]);
  const next = useCallback(() => go(safeIndex + 1), [go, safeIndex]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      prev();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      next();
    } else if (event.key === "Home") {
      event.preventDefault();
      go(0);
    } else if (event.key === "End") {
      event.preventDefault();
      go(count - 1);
    }
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if (isControlTarget(event.target)) return;
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      tracking: true,
      swiped: false,
    };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current.tracking) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
      dragRef.current.swiped = true;
    }
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current.tracking) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    const wasSwipe = dragRef.current.swiped || (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy));
    dragRef.current.tracking = false;

    if (wasSwipe) {
      dragRef.current.swiped = true;
      if (dx > 0) prev();
      else next();
    }
  }

  function onPointerCancel() {
    dragRef.current.tracking = false;
    dragRef.current.swiped = false;
  }

  function onStageClick() {
    if (dragRef.current.swiped) {
      dragRef.current.swiped = false;
      return;
    }
    // Click opens full-size when lightbox handler is provided; otherwise advance.
    if (onSlideClick) {
      onSlideClick(safeIndex);
      return;
    }
    if (count > 1) next();
  }

  if (!active || count === 0) return null;

  const stageStyle = aspectStyle(active.width, active.height, defaultAspect);

  return (
    <div
      className={`relative outline-none ${className}`}
      role="region"
      aria-roledescription="carousel"
      aria-labelledby={labelId}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <p id={labelId} className="sr-only">
        Image gallery carousel, slide {safeIndex + 1} of {count}. Use arrow keys or buttons to
        navigate.
      </p>

      {/*
        image-guard-stage adds the transparent hit layer (::after z-2). Controls use z-20
        so arrows / expand stay clickable; swipe handlers bubble from the stage.
      */}
      <div
        className="image-guard-stage relative w-full touch-pan-y overflow-hidden rounded-2xl border border-white/10 bg-black select-none"
        style={{
          ...stageStyle,
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClick={onStageClick}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        {slides.map((slide, i) => {
          const isActive = i === safeIndex;
          return (
            <div
              key={`${slide.src}-${i}`}
              className={`absolute inset-0 transition-opacity duration-[400ms] ease-out ${
                isActive ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              aria-hidden={!isActive}
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                draggable={false}
                sizes={sizes}
                quality={isActive ? 85 : 70}
                priority={i === 0}
                placeholder="blur"
                blurDataURL={BLUR_DATA}
                className="pointer-events-none object-cover"
              />
            </div>
          );
        })}

        <div
          className="pointer-events-none absolute inset-0 z-[3] bg-gradient-to-t from-black/40 via-transparent to-black/20"
          aria-hidden
        />

        {count > 1 ? (
          <>
            <button
              type="button"
              data-carousel-control
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/55 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm transition hover:border-white/50 hover:bg-black/70"
              aria-label="Previous image"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M10 3L5 8l5 5"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              data-carousel-control
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/55 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm transition hover:border-white/50 hover:bg-black/70"
              aria-label="Next image"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M6 3l5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </>
        ) : null}

        {onSlideClick ? (
          <button
            type="button"
            data-carousel-control
            onClick={(e) => {
              e.stopPropagation();
              onSlideClick(safeIndex);
            }}
            className="absolute bottom-3 right-3 z-20 rounded-full border border-white/30 bg-black/55 px-3 py-1.5 text-[0.62rem] uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm transition hover:border-white/50 hover:bg-black/70"
            aria-label="View larger"
          >
            Expand
          </button>
        ) : null}
      </div>

      {count > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="font-mono text-[0.7rem] tracking-[0.18em] text-white/45">
            {padIndex(safeIndex + 1)}
            <span className="mx-1.5 text-white/25">/</span>
            {padIndex(count)}
          </p>
          <div
            className="flex flex-wrap items-center justify-end gap-1"
            role="tablist"
            aria-label="Slides"
          >
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                data-carousel-control
                role="tab"
                aria-selected={i === safeIndex}
                aria-label={`Go to image ${i + 1}`}
                onClick={() => go(i)}
                className="flex h-8 w-8 items-center justify-center"
              >
                <span
                  className={`block h-1.5 rounded-full transition-all ${
                    i === safeIndex ? "w-6 bg-white/85" : "w-2 bg-white/30 hover:bg-white/55"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
