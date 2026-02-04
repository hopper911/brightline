import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      token?: string;
      imageId?: string;
      action?: "add" | "remove";
      note?: string;
    };

    const { token, imageId, action = "add", note } = body;

    if (!token || !imageId) {
      return NextResponse.json(
        { ok: false, error: "Token and imageId are required." },
        { status: 400 }
      );
    }

    // Validate token
    const access = await prisma.galleryAccessToken.findUnique({
      where: { token },
    });

    if (!access) {
      return NextResponse.json(
        { ok: false, error: "Invalid access token." },
        { status: 401 }
      );
    }

    if (access.expiresAt && access.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { ok: false, error: "Access token has expired." },
        { status: 410 }
      );
    }

    if (action === "add") {
      // Add favorite
      await prisma.galleryFavorite.upsert({
        where: {
          tokenId_imageId: {
            tokenId: access.id,
            imageId,
          },
        },
        create: {
          tokenId: access.id,
          imageId,
          note,
        },
        update: {
          note,
        },
      });

      // Log action
      await prisma.galleryAccessLog.create({
        data: {
          tokenId: access.id,
          action: "favorite",
          imageId,
        },
      });
    } else {
      // Remove favorite
      await prisma.galleryFavorite.deleteMany({
        where: {
          tokenId: access.id,
          imageId,
        },
      });

      // Log action
      await prisma.galleryAccessLog.create({
        data: {
          tokenId: access.id,
          action: "unfavorite",
          imageId,
        },
      });
    }

    return NextResponse.json({ ok: true, action });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { ok: false, error: "Failed to update favorite." },
      { status: 500 }
    );
  }
}
