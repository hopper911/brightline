import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/lib/storage";
import { hasAdminAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

const ROUTE = "api/admin/portfolio";

export async function GET() {
  try {
    const isAdmin = await hasAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const projects = await prisma.portfolioProject.findMany({
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        categoryRef: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ ok: true, projects });
  } catch (err: unknown) {
    console.error("PORTFOLIO_GET_ERROR", { route: ROUTE, err });
    const message = err instanceof Error ? err.message : "Failed to load projects.";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const isAdmin = await hasAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    let body: {
      title?: string;
      slug?: string;
      category?: string;
      categorySlug?: string;
      categoryId?: string;
      location?: string;
      year?: string;
      description?: string;
      coverUrl?: string;
      coverStorageKey?: string;
      coverAlt?: string;
      seoTitle?: string;
      seoDescription?: string;
      ogImageUrl?: string;
      externalGalleryUrl?: string;
      published?: boolean;
      images?: {
        url?: string;
        storageKey?: string;
        alt?: string;
        sortOrder?: number;
      }[];
    };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 }
      );
    }

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

    const coverUrl = body.coverStorageKey
      ? getPublicUrl(body.coverStorageKey)
      : body.coverUrl;

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
        coverUrl: coverUrl || null,
        coverStorageKey: body.coverStorageKey || null,
        coverAlt: body.coverAlt || null,
        seoTitle: body.seoTitle || null,
        seoDescription: body.seoDescription || null,
        ogImageUrl: body.ogImageUrl || null,
        externalGalleryUrl: body.externalGalleryUrl || null,
        published: Boolean(body.published),
        images: body.images?.length
          ? {
              create: body.images.map((img, index) => {
                const imageUrl = img.storageKey
                  ? getPublicUrl(img.storageKey)
                  : img.url || "";
                return {
                  url: imageUrl,
                  storageKey: img.storageKey || null,
                  alt: img.alt || null,
                  sortOrder:
                    typeof img.sortOrder === "number" ? img.sortOrder : index,
                };
              }),
            }
          : undefined,
      },
      include: { images: true },
    });

    return NextResponse.json({ ok: true, project });
  } catch (err: unknown) {
    console.error("PORTFOLIO_POST_ERROR", { route: ROUTE, err });
    const message = err instanceof Error ? err.message : "Failed to create project.";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const isAdmin = await hasAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    let body: {
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
      coverStorageKey?: string | null;
      coverAlt?: string | null;
      seoTitle?: string | null;
      seoDescription?: string | null;
      ogImageUrl?: string | null;
      externalGalleryUrl?: string | null;
      published?: boolean;
      images?: {
        id: string;
        alt?: string | null;
        sortOrder?: number;
        storageKey?: string | null;
      }[];
      newImages?: {
        url?: string;
        storageKey?: string | null;
        alt?: string | null;
        sortOrder?: number;
      }[];
    };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 }
      );
    }

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

    const coverUrl = body.coverStorageKey
      ? getPublicUrl(body.coverStorageKey)
      : body.coverUrl;

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
        coverUrl: coverUrl ?? undefined,
        coverStorageKey: body.coverStorageKey ?? undefined,
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
              storageKey: img.storageKey ?? undefined,
            },
          })
        )
      );
    }

    if (body.newImages?.length) {
      await prisma.portfolioImage.createMany({
        data: body.newImages.map((img, index) => {
          const imageUrl = img.storageKey
            ? getPublicUrl(img.storageKey)
            : img.url || "";
          return {
            projectId: project.id,
            url: imageUrl,
            storageKey: img.storageKey ?? null,
            alt: img.alt ?? null,
            sortOrder:
              typeof img.sortOrder === "number" ? img.sortOrder : index,
          };
        }),
      });
    }

    return NextResponse.json({ ok: true, project });
  } catch (err: unknown) {
    console.error("PORTFOLIO_PATCH_ERROR", { route: ROUTE, err });
    const message = err instanceof Error ? err.message : "Failed to update project.";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
