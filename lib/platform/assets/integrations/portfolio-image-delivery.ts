import "server-only";

import { findPlatformAssetsByIds } from "@/lib/platform/assets/repository-batch";
import {
  portfolioImageLegacyReference,
  resolveDomainMedia,
} from "@/lib/platform/assets/resolve-domain-media";
import { getAssetReadMetrics, resetAssetReadMetrics } from "@/lib/platform/assets/read-observability";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import type { MediaService } from "@/lib/platform/media/media-service";
import { defaultMediaService } from "@/lib/platform/media/server";
import { resolveStoredMediaUrl } from "@/lib/r2";

export type PortfolioImageReadRow = {
  id: string;
  url: string;
  storageKey?: string | null;
  fullUrl?: string | null;
  thumbUrl?: string | null;
  alt?: string | null;
  sortOrder: number;
  assetId?: string | null;
  isHero?: boolean;
};

export type PortfolioProjectReadRow = {
  id: string;
  images: PortfolioImageReadRow[];
  [key: string]: unknown;
};

function legacyDeliveryUrl(legacyReference: string | null | undefined): string {
  if (!legacyReference?.trim()) return "";
  return resolveStoredMediaUrl(legacyReference);
}

async function deliveryUrlForObjectRef(
  objectRef: { vault: "brightline" | "mirotech-site"; objectKey: string },
  mediaService: MediaService
): Promise<string> {
  const context = createPlatformContextForTenant("brightline");
  const delivery = await mediaService.getAssetUrl(context, objectRef);
  return delivery.url;
}

/**
 * Resolve one portfolio image to a browser delivery URL (Phase 4D).
 * Flag off → legacy url path only. Flag on → asset registry + MediaService with legacy fallback.
 */
export async function resolvePortfolioImageDeliveryUrl(
  image: PortfolioImageReadRow,
  options?: {
    mediaService?: MediaService;
    preloadedAssets?: Map<string, import("@/lib/platform/assets/types").PlatformAssetRecord>;
  }
): Promise<{ url: string; source: "asset" | "legacy" | null }> {
  const context = createPlatformContextForTenant("brightline");
  const legacyReference = portfolioImageLegacyReference(image);
  const mediaService = options?.mediaService ?? defaultMediaService;

  if (!isPlatformFeatureEnabled("assetRead")) {
    const url = legacyDeliveryUrl(legacyReference) || image.url;
    return { url, source: legacyReference ? "legacy" : null };
  }

  const resolved = await resolveDomainMedia(
    {
      assetId: image.assetId,
      legacyReference,
      expectVault: "brightline",
    },
    context,
    { preloadedAssets: options?.preloadedAssets }
  );

  if (!resolved.objectRef) {
    return { url: image.url, source: null };
  }

  const url = await deliveryUrlForObjectRef(resolved.objectRef, mediaService);
  return { url, source: resolved.source };
}

/**
 * Enrich admin portfolio GET payload — batch asset preload, no N+1 registry lookups.
 * Legacy fields (storageKey, assetId) are preserved; url is replaced with resolved delivery URL when flag on.
 */
export async function enrichPortfolioProjectsForAdminRead<T extends PortfolioProjectReadRow>(
  projects: T[],
  options?: { mediaService?: MediaService }
): Promise<T[]> {
  if (!isPlatformFeatureEnabled("assetRead")) {
    return projects;
  }

  resetAssetReadMetrics();

  const assetIds = projects.flatMap((p) =>
    p.images.map((img) => img.assetId?.trim()).filter((id): id is string => Boolean(id))
  );
  const preloadedAssets = await findPlatformAssetsByIds(assetIds);
  const mediaService = options?.mediaService ?? defaultMediaService;

  const enriched = await Promise.all(
    projects.map(async (project) => {
      const images = await Promise.all(
        project.images.map(async (image) => {
          const { url } = await resolvePortfolioImageDeliveryUrl(image, {
            mediaService,
            preloadedAssets,
          });
          return { ...image, url };
        })
      );
      return { ...project, images };
    })
  );

  const metrics = getAssetReadMetrics();
  if (
    metrics.assetReadSuccess +
      metrics.assetFallbackLegacy +
      metrics.assetMissing +
      metrics.assetTenantMismatch >
    0
  ) {
    console.info("[platform-asset-read] portfolio admin batch", JSON.stringify(metrics));
  }

  return enriched;
}
