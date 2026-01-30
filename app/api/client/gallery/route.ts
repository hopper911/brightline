import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { getClientDownloadUrl, assertClientImage } from "@/lib/image-strategy";

export const runtime = "nodejs";

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

    const { gallery } = access;

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
          sortOrder: image.sortOrder,
          storageKey: image.storageKey,
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
        coverUrl: gallery.coverUrl,
        clientName: gallery.client?.name ?? null,
        projectTitle: gallery.project?.title ?? null,
        images: images.filter(Boolean),
      },
    });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { ok: false, error: "Unable to load gallery." },
      { status: 500 }
    );
  }
}
