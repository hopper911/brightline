import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { getClientDownloadUrl, assertClientImage } from "@/lib/image-strategy";

export const runtime = "nodejs";

function getClientIp(req: Request): string | null {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { token?: string };
    const token = body.token?.trim();

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Access code is required." },
        { status: 400 }
      );
    }

    const access = await prisma.galleryAccessToken.findUnique({
      where: { token },
      include: {
        gallery: {
          include: {
            images: { orderBy: { sortOrder: "asc" } },
            client: true,
            project: true,
          },
        },
        favorites: true,
      },
    });

    if (!access || !access.gallery) {
      return NextResponse.json(
        { ok: false, error: "That access code is not valid." },
        { status: 404 }
      );
    }

    if (access.expiresAt && access.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { ok: false, error: "That access code has expired." },
        { status: 410 }
      );
    }

    // Log gallery view
    try {
      await prisma.galleryAccessLog.create({
        data: {
          tokenId: access.id,
          action: "view",
          ip: getClientIp(req),
          userAgent: req.headers.get("user-agent"),
        },
      });
    } catch (logError) {
      console.error("Failed to log gallery access:", logError);
    }

    const { gallery } = access;
    const favoriteImageIds = new Set(access.favorites.map((f) => f.imageId));

    let missingPrivate = 0;
    const images = await Promise.all(
      gallery.images.map(async (image) => {
        try {
          assertClientImage(image.storageKey);
        } catch {
          missingPrivate += 1;
          return null;
        }

        const signed = await getClientDownloadUrl({ key: image.storageKey! });
        return {
          id: image.id,
          url: signed.url,
          alt: image.alt,
          filename: image.filename,
          sortOrder: image.sortOrder,
          storageKey: image.storageKey,
          isFavorite: favoriteImageIds.has(image.id),
        };
      })
    );

    if (missingPrivate > 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Gallery contains images without private storage keys. Please re-upload via the client gallery flow.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      gallery: {
        id: gallery.id,
        title: gallery.title,
        slug: gallery.slug,
        description: gallery.description,
        clientNotes: gallery.clientNotes,
        coverUrl: gallery.coverUrl,
        clientName: gallery.client?.name ?? null,
        projectTitle: gallery.project?.title ?? null,
        images: images.filter(Boolean),
        allowDownload: access.allowDownload,
        expiresAt: access.expiresAt?.toISOString() ?? null,
      },
      tokenId: access.id,
    });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { ok: false, error: "Unable to load gallery." },
      { status: 500 }
    );
  }
}
