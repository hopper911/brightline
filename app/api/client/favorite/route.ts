import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { isGalleryViewableByClient } from "@/lib/gallery-client-delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      token?: string;
      imageId?: string;
      action?: "add" | "remove";
      note?: string;
    };

    const jar = await cookies();
    const { imageId, action = "add", note } = body;
    const accessId = jar.get("client_access_id")?.value;

    if (!accessId || !imageId) {
      return NextResponse.json(
        { ok: false, error: "Access session and imageId are required." },
        { status: 400 }
      );
    }

    // Validate token
    const access = await prisma.galleryAccessToken.findUnique({
      where: { id: accessId },
      include: { gallery: true },
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

    if (!access.isActive) {
      return NextResponse.json(
        { ok: false, error: "Access code is no longer active." },
        { status: 403 }
      );
    }

    if (!access.gallery || !isGalleryViewableByClient(access.gallery)) {
      return NextResponse.json(
        { ok: false, error: "Gallery is not available." },
        { status: 403 }
      );
    }

    jar.set("client_access", "true", {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });

    jar.set("client_access_id", access.id, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });

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
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to update favorite." },
      { status: 500 }
    );
  }
}
