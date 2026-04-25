import { prisma } from "@/lib/prisma";

const HOMEPAGE_FEATURED_KEY = "homepage_featured_media_id";

export async function getHomepageFeaturedMedia(): Promise<{
  keyFull: string | null;
  keyThumb: string | null;
  displayKey: string;
  alt: string | null;
} | null> {
  const setting = await prisma.siteSetting.findUnique({
    where: { key: HOMEPAGE_FEATURED_KEY },
  });
  const mediaId = setting?.value?.trim();
  if (!mediaId) return null;

  // findUnique may only use unique fields (`id`). Filtering by kind is done after load.
  const media = await prisma.mediaAsset.findUnique({
    where: { id: mediaId },
  });
  if (!media || media.kind !== "IMAGE") return null;

  const displayKey = media.keyThumb ?? media.keyFull;
  if (!displayKey) return null;

  return {
    keyFull: media.keyFull,
    keyThumb: media.keyThumb,
    displayKey,
    alt: media.alt,
  };
}

export async function setHomepageFeaturedMedia(mediaId: string): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key: HOMEPAGE_FEATURED_KEY },
    create: { key: HOMEPAGE_FEATURED_KEY, value: mediaId },
    update: { value: mediaId },
  });
}
