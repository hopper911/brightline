import { prisma } from "@/lib/prisma";

const HOMEPAGE_FEATURED_KEY = "homepage_featured_media_id";

export async function getHomepageFeaturedMedia(): Promise<{
  keyFull: string;
  alt: string | null;
} | null> {
  const setting = await prisma.siteSetting.findUnique({
    where: { key: HOMEPAGE_FEATURED_KEY },
  });
  const mediaId = setting?.value?.trim();
  if (!mediaId) return null;

  const media = await prisma.mediaAsset.findUnique({
    where: { id: mediaId, kind: "IMAGE" },
  });
  if (!media?.keyFull) return null;

  return {
    keyFull: media.keyFull,
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
