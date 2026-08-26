"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const GUARD_ATTR = "data-image-guard";
const LONG_PRESS_MS = 280;

/** Routes where clients are meant to save / download assets. */
function isDownloadAllowedPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/client") ||
    pathname.startsWith("/package") ||
    pathname.startsWith("/final-package") ||
    pathname.startsWith("/delivery")
  );
}

const GUARD_SELECTOR =
  "img, video, picture, canvas, .yarl__container, .yarl__slide, .yarl__slide_image, .yarl__flex_center, .image-guard-overlay, .image-guard-stage, [aria-roledescription='carousel']";

function isInteractive(el: Element): boolean {
  return Boolean(
    el.closest(
      "a, button, [role='button'], input, textarea, select, label, [data-carousel-control], [data-allow-save], [contenteditable='true']"
    )
  );
}

function isInsideLightbox(el: Element): boolean {
  return Boolean(el.closest(".yarl__root, .yarl__container, .yarl__portal"));
}

/** Leaflet tiles are <img> nodes — never treat them as portfolio media. */
function isInsideMap(el: Element): boolean {
  return Boolean(el.closest(".leaflet-container, .travel-itinerary-map"));
}

function isGuardedMediaTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("[data-allow-save]")) return false;
  if (isInsideMap(target)) return false;
  if (target instanceof HTMLImageElement || target instanceof HTMLVideoElement) return true;
  return Boolean(target.closest(GUARD_SELECTOR));
}

function applyMediaAttrs(el: HTMLElement) {
  el.setAttribute("draggable", "false");
  el.style.setProperty("-webkit-user-drag", "none");
  el.style.setProperty("-webkit-touch-callout", "none");
  el.style.setProperty("user-select", "none");
  el.style.setProperty("-webkit-user-select", "none");
}

function markUndraggable(root: ParentNode) {
  if (root instanceof HTMLImageElement || root instanceof HTMLVideoElement) {
    applyMediaAttrs(root);
    return;
  }
  if (!(root instanceof Element || root instanceof Document || root instanceof DocumentFragment)) {
    return;
  }
  root.querySelectorAll?.("img, video").forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (isInsideMap(node)) return;
    applyMediaAttrs(node);
  });
}

/**
 * Blocks drag, right-click/long-press save, select, and copy/cut on portfolio media.
 * Covers desktop + mobile (iOS/Android Save Image callouts).
 * Client delivery routes are excluded so authorized downloads still work.
 * Note: deterrent only — screenshots / DevTools can still capture pixels.
 */
export default function ImageProtection() {
  const pathname = usePathname();
  const disabled = isDownloadAllowedPath(pathname);

  useEffect(() => {
    if (disabled) {
      document.documentElement.removeAttribute(GUARD_ATTR);
      return;
    }

    document.documentElement.setAttribute(GUARD_ATTR, "");
    markUndraggable(document.body);

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof Element || node instanceof DocumentFragment) {
            markUndraggable(node);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    let touchMoved = false;
    let suppressCallout = false;

    const clearLongPress = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    const onContextMenu = (event: Event) => {
      if (isGuardedMediaTarget(event.target) || suppressCallout) {
        event.preventDefault();
        event.stopPropagation();
        suppressCallout = false;
      }
    };

    const onDragStart = (event: DragEvent) => {
      if (isGuardedMediaTarget(event.target)) {
        event.preventDefault();
      }
    };

    const onSelectStart = (event: Event) => {
      if (isGuardedMediaTarget(event.target)) {
        event.preventDefault();
      }
    };

    const onCopyOrCut = (event: ClipboardEvent) => {
      if (isGuardedMediaTarget(event.target)) {
        event.preventDefault();
      }
    };

    /**
     * Mobile: block Save Image / callout on long-press.
     * - Direct img/video touches: non-passive preventDefault (rare; most imgs are pointer-events:none).
     * - Guarded wrappers: arm a timer so the following iOS/Android contextmenu is suppressed.
     * Interactive controls + carousel swipe movement are left alone.
     */
    const onTouchStart = (event: TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!isGuardedMediaTarget(target)) return;
      if (isInteractive(target)) return;

      touchMoved = false;
      suppressCallout = false;
      clearLongPress();

      // Lightbox needs native pan / pinch / scroll — never cancel its touches.
      if (isInsideLightbox(target)) {
        longPressTimer = setTimeout(() => {
          if (!touchMoved) suppressCallout = true;
        }, LONG_PRESS_MS);
        return;
      }

      // Direct bitmap target outside lightbox: stop iOS callout.
      if (
        (target instanceof HTMLImageElement || target instanceof HTMLVideoElement) &&
        event.cancelable
      ) {
        event.preventDefault();
        return;
      }

      longPressTimer = setTimeout(() => {
        if (!touchMoved) {
          suppressCallout = true;
        }
      }, LONG_PRESS_MS);
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!longPressTimer && !suppressCallout) return;
      const touch = event.touches[0];
      if (!touch) return;
      touchMoved = true;
      clearLongPress();
      suppressCallout = false;
    };

    const onTouchEnd = () => {
      clearLongPress();
      // Keep suppressCallout briefly so delayed contextmenu still sees it.
      window.setTimeout(() => {
        suppressCallout = false;
      }, 400);
    };

    /** Some Android browsers fire this instead of / alongside contextmenu. */
    const onGestureStart = (event: Event) => {
      if (!(event.target instanceof Element)) return;
      if (isInsideLightbox(event.target)) return;
      if (isGuardedMediaTarget(event.target)) {
        event.preventDefault();
      }
    };

    document.addEventListener("contextmenu", onContextMenu, { capture: true });
    document.addEventListener("dragstart", onDragStart, { capture: true });
    document.addEventListener("selectstart", onSelectStart, { capture: true });
    document.addEventListener("copy", onCopyOrCut, { capture: true });
    document.addEventListener("cut", onCopyOrCut, { capture: true });
    document.addEventListener("touchstart", onTouchStart, { capture: true, passive: false });
    document.addEventListener("touchmove", onTouchMove, { capture: true, passive: true });
    document.addEventListener("touchend", onTouchEnd, { capture: true, passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { capture: true, passive: true });
    document.addEventListener("gesturestart", onGestureStart, { capture: true });

    return () => {
      document.documentElement.removeAttribute(GUARD_ATTR);
      observer.disconnect();
      clearLongPress();
      document.removeEventListener("contextmenu", onContextMenu, { capture: true });
      document.removeEventListener("dragstart", onDragStart, { capture: true });
      document.removeEventListener("selectstart", onSelectStart, { capture: true });
      document.removeEventListener("copy", onCopyOrCut, { capture: true });
      document.removeEventListener("cut", onCopyOrCut, { capture: true });
      document.removeEventListener("touchstart", onTouchStart, { capture: true });
      document.removeEventListener("touchmove", onTouchMove, { capture: true });
      document.removeEventListener("touchend", onTouchEnd, { capture: true });
      document.removeEventListener("touchcancel", onTouchEnd, { capture: true });
      document.removeEventListener("gesturestart", onGestureStart, { capture: true });
    };
  }, [disabled]);

  return null;
}
