import { prisma } from "@/lib/prisma";

export async function getAdminGalleryDetail(id: string) {
  const gallery = await prisma.gallery.findUnique({
    where: { id },
    include: {
      client: true,
      project: true,
      studioProject: { select: { id: true, title: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" } },
      accessTokens: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!gallery) return null;

  const accessTokens = await Promise.all(
    gallery.accessTokens.map(async (t) => {
      const selectedCount = await prisma.galleryImageSelection.count({
        where: { tokenId: t.id, selected: true },
      });
      return { ...t, selectedCount };
    })
  );

  return { ...gallery, accessTokens };
}
