import { prisma } from "@/lib/prisma";

export type PublicGalleryCard = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  imageCount: number;
  galleryType: string | null;
  updatedAt: Date;
};

export type PublicGalleryDetail = PublicGalleryCard & {
  images: Array<{
    id: string;
    url: string;
    alt: string;
    filename: string | null;
  }>;
};

function firstPublicImageUrl(images: Array<{ url: string }>) {
  const first = images[0];
  return first?.url || null;
}

export async function getPublishedGalleryCards(limit = 9): Promise<PublicGalleryCard[]> {
  const galleries = await prisma.gallery.findMany({
    where: {
      published: true,
    },
    orderBy: [{ updatedAt: "desc" }],
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      coverUrl: true,
      updatedAt: true,
      images: {
        orderBy: { sortOrder: "asc" },
        select: {
          url: true,
        },
      },
    },
  });

  return galleries.map((gallery) => ({
    id: gallery.id,
    title: gallery.title,
    slug: gallery.slug,
    description: gallery.description,
    coverUrl: gallery.coverUrl || firstPublicImageUrl(gallery.images),
    imageCount: gallery.images.length,
    galleryType: null,
    updatedAt: gallery.updatedAt,
  }));
}

export async function getPublishedGalleryDetail(
  slug: string
): Promise<PublicGalleryDetail | null> {
  const gallery = await prisma.gallery.findFirst({
    where: {
      slug: { equals: slug, mode: "insensitive" },
      published: true,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      coverUrl: true,
      updatedAt: true,
      images: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          url: true,
          alt: true,
          filename: true,
        },
      },
    },
  });

  if (!gallery) return null;

  return {
    id: gallery.id,
    title: gallery.title,
    slug: gallery.slug,
    description: gallery.description,
    coverUrl: gallery.coverUrl || firstPublicImageUrl(gallery.images),
    imageCount: gallery.images.length,
    galleryType: null,
    updatedAt: gallery.updatedAt,
    images: gallery.images
      .map((image) => ({
        id: image.id,
        url: image.url,
        alt: image.alt || gallery.title,
        filename: image.filename,
      }))
      .filter((image) => image.url),
  };
}
