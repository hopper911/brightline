"use client";

import { useEffect } from "react";

const GUARD_ATTR = "data-image-guard";

function isGuardedMediaTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target instanceof HTMLImageElement || target instanceof HTMLVideoElement) return true;
  return Boolean(
    target.closest("img, video, picture, .yarl__container, .yarl__slide, .image-guard-overlay")
  );
}

function markUndraggable(root: ParentNode) {
  if (root instanceof HTMLImageElement || root instanceof HTMLVideoElement) {
    root.setAttribute("draggable", "false");
    return;
  }
  if (!(root instanceof Element || root instanceof Document || root instanceof DocumentFragment)) {
    return;
  }
  root.querySelectorAll?.("img, video").forEach((el) => {
    el.setAttribute("draggable", "false");
  });
}

/** Blocks drag, right-click save, and touch callout on images across the public site. */
export default function ImageProtection() {
  useEffect(() => {
    document.documentElement.setAttribute(GUARD_ATTR, "");

    markUndraggable(document.body);

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          markUndraggable(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const onContextMenu = (event: MouseEvent) => {
      if (isGuardedMediaTarget(event.target)) {
        event.preventDefault();
      }
    };

    const onDragStart = (event: DragEvent) => {
      if (isGuardedMediaTarget(event.target)) {
        event.preventDefault();
      }
    };

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("dragstart", onDragStart);

    return () => {
      document.documentElement.removeAttribute(GUARD_ATTR);
      observer.disconnect();
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("dragstart", onDragStart);
    };
  }, []);

  return null;
}
