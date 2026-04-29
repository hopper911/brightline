import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { isGalleryViewableByClient } from "@/lib/gallery-client-delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DeliveryGroup = "full-res" | "web-ready" | "social" | "heroes";

function metaString(meta: unknown, key: string): string {
  if (!meta || typeof meta !== "object" || !(key in meta)) return "";
  const value = (meta as Record<string, unknown>)[key];
  return typeof value === "string" ? value.toLowerCase() : "";
}

function imageMatchesDeliveryGroup(
  image: { isHero?: boolean | null; meta?: unknown },
  group: DeliveryGroup
) {
  if (group === "heroes") return Boolean(image.isHero);

  const usageType = metaString(image.meta, "usageType");
  const deliveryFolder = metaString(image.meta, "deliveryFolder");
  const combined = `${usageType} ${deliveryFolder}`;

  if (group === "social") return combined.includes("social");
  if (group === "web-ready") {
    return combined.includes("web") || combined.includes("online");
  }
  return (
    combined.includes("full") ||
    combined.includes("print") ||
    combined.includes("archive")
  );
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      token?: string;
      imageId?: string;
      videoId?: string;
      type?: "single" | "favorites" | "deliveryGroup";
      deliveryGroup?: DeliveryGroup;
      quality?: "low" | "high";
    };

    const jar = await cookies();
    const { imageId, videoId, type = "single", deliveryGroup, quality = "high" } = body;
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
            videos: true,
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

    if (!access.gallery || !isGalleryViewableByClient(access.gallery)) {
      return NextResponse.json(
        { ok: false, error: "Gallery is not available." },
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

    if (type === "single" && videoId) {
      const video = access.gallery?.videos.find((row) => row.id === videoId);
      if (!video || !video.allowDownload) {
        return NextResponse.json(
          { ok: false, error: "Video not found." },
          { status: 404 }
        );
      }

      const { getClientDownloadUrl } = await import("@/lib/image-strategy");
      const signed = await getClientDownloadUrl({ key: video.storageKey });

      await prisma.galleryDownload.create({
        data: {
          tokenId: access.id,
          type: "video",
        },
      });

      await prisma.galleryAccessLog.create({
        data: {
          tokenId: access.id,
          action: "download:video",
        },
      });

      return NextResponse.json({
        ok: true,
        downloadUrl: signed.url,
        filename: video.filename || `video-${video.id}.mp4`,
      });
    }

    if (type === "single" && imageId) {
      // Single image download
      const image = access.gallery?.images.find((img) => img.id === imageId);
      const key = quality === "low" ? (image?.lowResStorageKey ?? image?.storageKey) : image?.storageKey;
      if (!image || !key) {
        return NextResponse.json(
          { ok: false, error: "Image not found." },
          { status: 404 }
        );
      }

      const { getClientDownloadUrl } = await import("@/lib/image-strategy");
      const signed = await getClientDownloadUrl({
        key,
      });

      // Log download
      await prisma.galleryDownload.create({
        data: {
          tokenId: access.id,
          imageId,
          type: `single:${quality}`,
        },
      });

      await prisma.galleryAccessLog.create({
        data: {
          tokenId: access.id,
          action: `download:${quality}`,
          imageId,
        },
      });

      return NextResponse.json({
        ok: true,
        downloadUrl: signed.url,
        filename: `${quality}-${image.filename || `image-${image.id}.jpg`}`,
      });
    } else if (type === "favorites") {
      // Get all favorite images
      const favoriteImageIds = access.favorites.map((f) => f.imageId);
      const favoriteImages = access.gallery?.images.filter(
        (img) =>
          favoriteImageIds.includes(img.id) &&
          (quality === "low" ? img.lowResStorageKey || img.storageKey : img.storageKey)
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
          const { getClientDownloadUrl } = await import("@/lib/image-strategy");
          const key = quality === "low" ? (image.lowResStorageKey ?? image.storageKey!) : image.storageKey!;
          const signed = await getClientDownloadUrl({
            key,
          });
          return {
            id: image.id,
            url: signed.url,
            filename: `${quality}-${image.filename || `image-${image.id}.jpg`}`,
          };
        })
      );

      // Log download
      await prisma.galleryDownload.create({
        data: {
          tokenId: access.id,
          type: `favorites:${quality}`,
        },
      });

      await prisma.galleryAccessLog.create({
        data: {
          tokenId: access.id,
          action: `download:favorites:${quality}`,
        },
      });

      return NextResponse.json({
        ok: true,
        downloads,
        count: downloads.length,
      });
    } else if (type === "deliveryGroup" && deliveryGroup) {
      const downloadableImages = (access.gallery?.images || []).filter(
        (img) => (quality === "low" ? img.lowResStorageKey || img.storageKey : img.storageKey)
      );
      const explicitMatches = downloadableImages.filter((img) =>
        imageMatchesDeliveryGroup(img, deliveryGroup)
      );
      const deliveryImages =
        explicitMatches.length > 0 ||
        deliveryGroup === "social" ||
        deliveryGroup === "heroes"
          ? explicitMatches
          : downloadableImages;

      if (deliveryImages.length === 0) {
        return NextResponse.json(
          { ok: false, error: "No files available for this delivery section." },
          { status: 400 }
        );
      }

      const downloads = await Promise.all(
        deliveryImages.map(async (image) => {
          const { getClientDownloadUrl } = await import("@/lib/image-strategy");
          const key = quality === "low" ? (image.lowResStorageKey ?? image.storageKey!) : image.storageKey!;
          const signed = await getClientDownloadUrl({
            key,
          });
          return {
            id: image.id,
            url: signed.url,
            filename: `${quality}-${image.filename || `image-${image.id}.jpg`}`,
          };
        })
      );

      await prisma.galleryDownload.create({
        data: {
          tokenId: access.id,
          type: `delivery:${deliveryGroup}:${quality}`,
        },
      });

      await prisma.galleryAccessLog.create({
        data: {
          tokenId: access.id,
          action: `download:${deliveryGroup}:${quality}`,
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
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to generate download." },
      { status: 500 }
    );
  }
}
