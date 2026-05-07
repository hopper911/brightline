import { prisma } from "@/lib/prisma";
import { apiLog } from "@/lib/observability/log";

export type EngagementSurface = "delivery_package" | "client_gallery";

/**
 * Unified operational event stream for delivery + client gallery (for future analytics / AI summaries).
 * Non-blocking: failures are logged, callers keep succeeding.
 */
export function recordEngagementEvent(data: {
  surface: EngagementSurface;
  eventType: string;
  studioProjectId?: string | null;
  deliveryPackageId?: string | null;
  deliveryPackageItemId?: string | null;
  galleryId?: string | null;
  galleryAccessTokenId?: string | null;
  imageId?: string | null;
  durationMs?: number | null;
  clickOrder?: number | null;
  meta?: Record<string, unknown>;
}): void {
  prisma.engagementEvent
    .create({
      data: {
        surface: data.surface,
        eventType: data.eventType,
        studioProjectId: data.studioProjectId ?? null,
        deliveryPackageId: data.deliveryPackageId ?? null,
        deliveryPackageItemId: data.deliveryPackageItemId ?? null,
        galleryId: data.galleryId ?? null,
        galleryAccessTokenId: data.galleryAccessTokenId ?? null,
        imageId: data.imageId ?? null,
        durationMs: data.durationMs ?? null,
        clickOrder: data.clickOrder ?? null,
        meta: data.meta ? (data.meta as object) : undefined,
      },
    })
    .catch((err) =>
      apiLog("engagement", "warn", "EngagementEvent insert failed", {
        error: err instanceof Error ? err.message : String(err),
      })
    );
}
