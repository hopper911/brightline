import { prisma } from "@/lib/prisma";
import { signGalleryAsset } from "@/lib/gallery-delivery-assets";

export async function getAdminGalleryDetail(id: string) {
  const gallery = await prisma.gallery.findUnique({
    where: { id },
    include: {
      client: true,
      project: true,
      studioProject: { select: { id: true, title: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" } },
      videos: { orderBy: { sortOrder: "asc" } },
      accessTokens: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!gallery) return null;

  const images = await Promise.all(
    gallery.images.map(async (image) => {
      const low = await signGalleryAsset(image.lowResStorageKey ?? image.storageKey ?? null);
      const high = await signGalleryAsset(image.storageKey ?? null);
      return {
        ...image,
        url: low?.url ?? image.url,
        thumbUrl: low?.url ?? image.thumbUrl,
        fullUrl: high?.url ?? image.fullUrl,
      };
    })
  );

  const videos = await Promise.all(
    gallery.videos.map(async (video) => {
      const signed = await signGalleryAsset(video.storageKey);
      const poster = await signGalleryAsset(video.posterKey ?? null);
      return {
        ...video,
        url: signed?.url ?? null,
        posterUrl: poster?.url ?? null,
      };
    })
  );

  const accessTokens = await Promise.all(
    gallery.accessTokens.map(async (t) => {
      const selectedCount = await prisma.galleryImageSelection.count({
        where: { tokenId: t.id, selected: true },
      });
      return { ...t, selectedCount };
    })
  );

  return { ...gallery, images, videos, accessTokens };
}
