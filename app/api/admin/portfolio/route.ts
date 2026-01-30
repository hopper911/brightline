import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const projects = await prisma.portfolioProject.findMany({
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      categoryRef: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ ok: true, projects });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    title?: string;
    slug?: string;
    category?: string;
    categorySlug?: string;
    categoryId?: string;
    location?: string;
    year?: string;
    description?: string;
    coverUrl?: string;
    coverAlt?: string;
    seoTitle?: string;
    seoDescription?: string;
    ogImageUrl?: string;
    externalGalleryUrl?: string;
    published?: boolean;
    images?: { url: string; alt?: string; sortOrder?: number }[];
  };

  if (!body.title || !body.slug || !body.category || !body.categorySlug) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields." },
      { status: 400 }
    );
  }

  const category =
    body.categoryId
      ? await prisma.portfolioCategory.findUnique({
          where: { id: body.categoryId },
        })
      : null;

  const project = await prisma.portfolioProject.create({
    data: {
      title: body.title,
      slug: body.slug,
      category: category?.name || body.category,
      categorySlug: category?.slug || body.categorySlug,
      categoryId: category?.id || null,
      location: body.location || null,
      year: body.year || null,
      description: body.description || null,
      coverUrl: body.coverUrl || null,
      coverAlt: body.coverAlt || null,
      seoTitle: body.seoTitle || null,
      seoDescription: body.seoDescription || null,
      ogImageUrl: body.ogImageUrl || null,
      externalGalleryUrl: body.externalGalleryUrl || null,
      published: Boolean(body.published),
      images: body.images?.length
        ? {
            create: body.images.map((img, index) => ({
              url: img.url,
              alt: img.alt || null,
              sortOrder:
                typeof img.sortOrder === "number" ? img.sortOrder : index,
            })),
          }
        : undefined,
    },
    include: { images: true },
  });

  return NextResponse.json({ ok: true, project });
}

export async function PATCH(req: Request) {
  const body = (await req.json()) as {
    id?: string;
    title?: string;
    slug?: string;
    category?: string;
    categorySlug?: string;
    categoryId?: string | null;
    location?: string | null;
    year?: string | null;
    description?: string | null;
    coverUrl?: string | null;
    coverAlt?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    ogImageUrl?: string | null;
    externalGalleryUrl?: string | null;
    published?: boolean;
    images?: { id: string; alt?: string | null; sortOrder?: number }[];
  };

  if (!body.id) {
    return NextResponse.json(
      { ok: false, error: "Missing project id." },
      { status: 400 }
    );
  }

  const category =
    body.categoryId
      ? await prisma.portfolioCategory.findUnique({
          where: { id: body.categoryId },
        })
      : null;

  const project = await prisma.portfolioProject.update({
    where: { id: body.id },
    data: {
      title: body.title ?? undefined,
      slug: body.slug ?? undefined,
      category: category?.name || body.category || undefined,
      categorySlug: category?.slug || body.categorySlug || undefined,
      categoryId:
        body.categoryId === null ? null : category?.id || undefined,
      location: body.location ?? undefined,
      year: body.year ?? undefined,
      description: body.description ?? undefined,
      coverUrl: body.coverUrl ?? undefined,
      coverAlt: body.coverAlt ?? undefined,
      seoTitle: body.seoTitle ?? undefined,
      seoDescription: body.seoDescription ?? undefined,
      ogImageUrl: body.ogImageUrl ?? undefined,
      externalGalleryUrl: body.externalGalleryUrl ?? undefined,
      published: typeof body.published === "boolean" ? body.published : undefined,
    },
    include: { images: true, categoryRef: true },
  });

  if (body.images?.length) {
    await Promise.all(
      body.images.map((img) =>
        prisma.portfolioImage.update({
          where: { id: img.id },
          data: {
            alt: img.alt ?? undefined,
            sortOrder:
              typeof img.sortOrder === "number" ? img.sortOrder : undefined,
          },
        })
      )
    );
  }

  return NextResponse.json({ ok: true, project });
}
