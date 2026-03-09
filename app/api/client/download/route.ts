import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { getClientDownloadUrl } from "@/lib/image-strategy";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      token?: string;
      imageId?: string;
      type?: "single" | "favorites";
    };

    const jar = await cookies();
    const { imageId, type = "single" } = body;
    const accessId = jar.get("client_access_id")?.value;

    if (!accessId) {
      return NextResponse.json(
        { ok: false, error: "Access session required." },
        { status: 400 }
      );
    }

    // Validate token
    const access = await prisma.galleryAccessToken.findUnique({
      where: { id: accessId },
      include: {
        gallery: {
          include: {
            images: true,
          },
        },
        favorites: true,
      },
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

    if (!access.allowDownload) {
      return NextResponse.json(
        { ok: false, error: "Downloads are not enabled for this gallery." },
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

    // Check download limits
    if (access.maxDownloads !== null) {
      const downloadCount = await prisma.galleryDownload.count({
        where: { tokenId: access.id },
      });
      if (downloadCount >= access.maxDownloads) {
        return NextResponse.json(
          { ok: false, error: "Download limit reached." },
          { status: 429 }
        );
      }
    }

    if (type === "single" && imageId) {
      // Single image download
      const image = access.gallery?.images.find((img) => img.id === imageId);
      if (!image || !image.storageKey) {
        return NextResponse.json(
          { ok: false, error: "Image not found." },
          { status: 404 }
        );
      }

      const signed = await getClientDownloadUrl({
        key: image.storageKey,
      });

      // Log download
      await prisma.galleryDownload.create({
        data: {
          tokenId: access.id,
          imageId,
          type: "single",
        },
      });

      await prisma.galleryAccessLog.create({
        data: {
          tokenId: access.id,
          action: "download",
          imageId,
        },
      });

      return NextResponse.json({
        ok: true,
        downloadUrl: signed.url,
        filename: image.filename || `image-${image.id}.jpg`,
      });
    } else if (type === "favorites") {
      // Get all favorite images
      const favoriteImageIds = access.favorites.map((f) => f.imageId);
      const favoriteImages = access.gallery?.images.filter(
        (img) => favoriteImageIds.includes(img.id) && img.storageKey
      );

      if (!favoriteImages || favoriteImages.length === 0) {
        return NextResponse.json(
          { ok: false, error: "No favorites to download." },
          { status: 400 }
        );
      }

      // Generate signed URLs for all favorites
      const downloads = await Promise.all(
        favoriteImages.map(async (image) => {
          const signed = await getClientDownloadUrl({
            key: image.storageKey!,
          });
          return {
            id: image.id,
            url: signed.url,
            filename: image.filename || `image-${image.id}.jpg`,
          };
        })
      );

      // Log download
      await prisma.galleryDownload.create({
        data: {
          tokenId: access.id,
          type: "favorites",
        },
      });

      await prisma.galleryAccessLog.create({
        data: {
          tokenId: access.id,
          action: "download",
        },
      });

      return NextResponse.json({
        ok: true,
        downloads,
        count: downloads.length,
      });
    }

    return NextResponse.json(
      { ok: false, error: "Invalid download request." },
      { status: 400 }
    );
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { ok: false, error: "Failed to generate download." },
      { status: 500 }
    );
  }
}
