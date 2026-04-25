import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { isGalleryViewableByClient } from "@/lib/gallery-client-delivery";

const galleryInclude = {
  images: { orderBy: { sortOrder: "asc" as const } },
  client: true,
  project: true,
} as const;

export async function loadClientGallerySession() {
  const jar = await cookies();
  const accessId = jar.get("client_access_id")?.value;
  if (!accessId) {
    return { ok: false as const, status: 401, error: "Access session required." };
  }

  const access = await prisma.galleryAccessToken.findUnique({
    where: { id: accessId },
    include: {
      gallery: { include: galleryInclude },
      favorites: true,
    },
  });

  if (!access || !access.gallery) {
    return {
      ok: false as const,
      status: 404,
      error: "That access code is not valid.",
    };
  }

  if (!access.isActive) {
    return {
      ok: false as const,
      status: 403,
      error: "That access code is no longer active.",
    };
  }

  if (access.expiresAt && access.expiresAt.getTime() < Date.now()) {
    return {
      ok: false as const,
      status: 410,
      error: "That access code has expired.",
    };
  }

  if (!isGalleryViewableByClient(access.gallery)) {
    return {
      ok: false as const,
      status: 403,
      error: "This gallery is not available for viewing.",
    };
  }

  return { ok: true as const, access };
}

export function imageBelongsToGallery(
  gallery: { images: { id: string }[] },
  imageId: string
) {
  return gallery.images.some((i) => i.id === imageId);
}
