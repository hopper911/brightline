"use client";

import { useEffect, useRef } from "react";

type Props = {
  accessToken: string;
};

export default function PackagePerformanceTracker({ accessToken }: Props) {
  const clickOrder = useRef(0);

  useEffect(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-package-item-id]"));
    const visibleSince = new Map<string, number>();

    const send = (payload: Record<string, unknown>) => {
      const body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(`/api/package/${accessToken}/track`, new Blob([body], { type: "application/json" }));
        return;
      }
      void fetch(`/api/package/${accessToken}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = entry.target as HTMLElement;
          const itemId = target.dataset.packageItemId;
          if (!itemId) continue;
          if (entry.isIntersecting) {
            visibleSince.set(itemId, Date.now());
          } else {
            const startedAt = visibleSince.get(itemId);
            if (startedAt) {
              visibleSince.delete(itemId);
              send({ itemId, eventType: "image_viewed", durationMs: Date.now() - startedAt });
            }
          }
        }
      },
      { threshold: 0.55 }
    );

    const onClick = (event: Event) => {
      const target = event.currentTarget as HTMLElement;
      const itemId = target.dataset.packageItemId;
      if (!itemId) return;
      clickOrder.current += 1;
      send({ itemId, eventType: "image_clicked", clickOrder: clickOrder.current });
    };

    for (const card of cards) {
      observer.observe(card);
      card.addEventListener("click", onClick);
    }

    return () => {
      for (const [itemId, startedAt] of visibleSince.entries()) {
        send({ itemId, eventType: "image_viewed", durationMs: Date.now() - startedAt });
      }
      for (const card of cards) card.removeEventListener("click", onClick);
      observer.disconnect();
    };
  }, [accessToken]);

  return null;
}

