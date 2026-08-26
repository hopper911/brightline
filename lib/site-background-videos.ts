import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { resolveFullBleedMediaUrl } from "@/lib/r2";

export const SITE_BACKGROUNDS_PREFIX = "site/backgrounds/";

export type ResolvedSiteBackgroundMedia = {
  enabled: boolean;
  videoUrl: string;
  posterUrl: string;
  cinematic: boolean;
  source: "catalog" | "theme" | "none";
  videoId: string | null;
  title: string | null;
};

function mediaUrl(input: string | null | undefined): string {
  return resolveFullBleedMediaUrl(input);
}

export function isVideoMediaUrl(url: string): boolean {
  const decoded = decodeURIComponent(url);
  try {
    const parsed = new URL(decoded, "https://brightline.local");
    const key = parsed.searchParams.get("key") ?? "";
    return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(key || parsed.pathname);
  } catch {
    return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(decoded);
  }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export { slugify as slugifyBackgroundVideoTitle };

export const getActiveSiteBackgroundVideo = cache(async () => {
  try {
    return await prisma.siteBackgroundVideo.findFirst({
      where: { isActive: true, enabled: true },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });
  } catch {
    return null;
  }
});

export async function resolveSiteBackgroundMedia(theme: {
  backgroundMediaEnabled: boolean;
  backgroundMediaUrl: string;
  backgroundPosterUrl: string;
  backgroundCinematic?: boolean;
}): Promise<ResolvedSiteBackgroundMedia> {
  const cinematic = theme.backgroundCinematic === true;
  const active = await getActiveSiteBackgroundVideo();
  if (active?.storageKey) {
    return {
      enabled: true,
      videoUrl: mediaUrl(active.webStorageKey || active.storageKey),
      posterUrl: mediaUrl(active.posterKey),
      cinematic,
      source: "catalog",
      videoId: active.id,
      title: active.title,
    };
  }

  if (theme.backgroundMediaEnabled && theme.backgroundMediaUrl.trim()) {
    return {
      enabled: true,
      videoUrl: mediaUrl(theme.backgroundMediaUrl),
      posterUrl: mediaUrl(theme.backgroundPosterUrl),
      cinematic,
      source: "theme",
      videoId: null,
      title: null,
    };
  }

  return {
    enabled: false,
    videoUrl: "",
    posterUrl: "",
    cinematic: false,
    source: "none",
    videoId: null,
    title: null,
  };
}

export async function setActiveBackgroundVideo(id: string): Promise<void> {
  await prisma.$transaction([
    prisma.siteBackgroundVideo.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    }),
    prisma.siteBackgroundVideo.update({
      where: { id },
      data: { isActive: true, enabled: true },
    }),
  ]);
}

export async function clearActiveBackgroundVideo(): Promise<void> {
  await prisma.siteBackgroundVideo.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });
}
