"use client";

import { useEffect, useRef, type RefObject } from "react";
import { getFocusableElements, handleFocusTrapKeydown } from "./focus-trap";

type FocusTrapOptions = {
  onEscape?: () => void;
  restoreFocus?: boolean;
  initialFocus?: "first" | "none";
};

/**
 * Trap keyboard focus inside an open modal/dialog and optionally restore on close.
 */
export function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  options: FocusTrapOptions = {}
): void {
  const { onEscape, restoreFocus = true, initialFocus = "first" } = options;
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    if (container && initialFocus === "first") {
      const focusable = getFocusableElements(container);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        container.focus();
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && onEscape) {
        event.preventDefault();
        onEscape();
        return;
      }
      const node = containerRef.current;
      if (node) handleFocusTrapKeydown(node, event);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (restoreFocus && previouslyFocusedRef.current?.focus) {
        previouslyFocusedRef.current.focus();
      }
    };
  }, [active, containerRef, onEscape, restoreFocus, initialFocus]);
}
