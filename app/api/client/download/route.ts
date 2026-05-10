import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { isGalleryViewableByClient } from "@/lib/gallery-client-delivery";
import { createR2KeysZipResponse, MAX_ZIP_FILES } from "@/lib/zip/r2KeysZipResponse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type DeliveryGroup = "full-res" | "web-ready" | "social" | "heroes";

function metaString(meta: unknown, key: string): string {
  if (!meta || typeof meta !== "object" || !(key in meta)) return "";
  const value = (meta as Record<string, unknown>)[key];
  return typeof value === "string" ? value.toLowerCase() : "";
}

type GalleryImageRow = {
  id: string;
  sortOrder: number;
  filename: string | null;
  storageKey: string | null;
  lowResStorageKey: string | null;
  meta?: unknown;
  isHero?: boolean | null;
};

function resolveGalleryImageKey(image: GalleryImageRow, quality: "low" | "high"): string | null {
  if (quality === "low") {
    return image.lowResStorageKey ?? image.storageKey ?? null;
  }
  return image.storageKey ?? null;
}

function zipEntryName(image: GalleryImageRow, quality: "low" | "high", index: number): string {
  const key = resolveGalleryImageKey(image, quality);
  const base = image.filename?.trim() || key?.split("/").pop() || "";
  const m = /\.(jpe?g|png|gif|webp|tiff?|heic|avif)$/i.exec(base);
  const ext = m ? m[0].toLowerCase() : ".jpg";
  const q = quality === "low" ? "web-ready" : "full-res";
  const ord = String(image.sortOrder ?? index).padStart(4, "0");
  return `${ord}-${image.id.slice(-8)}-${q}${ext}`;
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
      type?: "single" | "favorites" | "deliveryGroup" | "zip";
      deliveryGroup?: DeliveryGroup;
      zipScope?: "all" | "favorites" | "deliveryGroup";
      quality?: "low" | "high";
    };

    const jar = await cookies();
    const { imageId, videoId, type = "single", deliveryGroup, zipScope, quality = "high" } = body;
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

    if (type === "zip") {
      if (zipScope !== "all" && zipScope !== "favorites" && zipScope !== "deliveryGroup") {
        return NextResponse.json({ ok: false, error: "Invalid or missing zipScope." }, { status: 400 });
      }
      if (zipScope === "deliveryGroup" && !deliveryGroup) {
        return NextResponse.json(
          { ok: false, error: "deliveryGroup is required for section ZIP downloads." },
          { status: 400 }
        );
      }

      const images: GalleryImageRow[] =
        zipScope === "all"
          ? (access.gallery?.images ?? []).filter((img) => resolveGalleryImageKey(img, quality))
          : zipScope === "favorites"
            ? (() => {
                const favoriteImageIds = new Set(access.favorites.map((f) => f.imageId));
                return (access.gallery?.images ?? []).filter(
                  (img) => favoriteImageIds.has(img.id) && resolveGalleryImageKey(img, quality)
                );
              })()
            : (() => {
                const dg = deliveryGroup!;
                const downloadableImages = (access.gallery?.images || []).filter((img) =>
                  resolveGalleryImageKey(img, quality)
                );
                const explicitMatches = downloadableImages.filter((img) =>
                  imageMatchesDeliveryGroup(img, dg)
                );
                return explicitMatches.length > 0 || dg === "social" || dg === "heroes"
                  ? explicitMatches
                  : downloadableImages;
              })();

      if (images.length === 0) {
        return NextResponse.json({ ok: false, error: "No images available for this ZIP." }, { status: 400 });
      }

      if (images.length > MAX_ZIP_FILES) {
        return NextResponse.json(
          {
            ok: false,
            error: `Too many files for one ZIP (${images.length}; max ${MAX_ZIP_FILES}). Contact the studio for split delivery.`,
          },
          { status: 400 }
        );
      }

      const sorted = [...images].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)
      );

      const seen = new Set<string>();
      const entries = sorted.map((img, i) => {
        const key = resolveGalleryImageKey(img, quality)!;
        let name = zipEntryName(img, quality, i);
        if (seen.has(name)) {
          let k = 2;
          const dot = name.lastIndexOf(".");
          const stem = dot === -1 ? name : name.slice(0, dot);
          const ext = dot === -1 ? "" : name.slice(dot);
          while (seen.has(`${stem}-${k}${ext}`)) k++;
          name = `${stem}-${k}${ext}`;
        }
        seen.add(name);
        return { key, name };
      });

      const zipTypeLabel =
        zipScope === "deliveryGroup" && deliveryGroup
          ? `zip:${deliveryGroup}:${quality}`
          : `zip:${zipScope}:${quality}`;

      await prisma.galleryDownload.create({
        data: {
          tokenId: access.id,
          type: zipTypeLabel,
        },
      });

      const logAction =
        zipScope === "deliveryGroup" && deliveryGroup
          ? `download:zip:${deliveryGroup}:${quality}`
          : `download:zip:${zipScope}:${quality}`;

      await prisma.galleryAccessLog.create({
        data: {
          tokenId: access.id,
          action: logAction,
        },
      });

      const rawTitle = access.gallery?.title?.trim() || access.gallery?.slug?.trim() || "gallery";
      const slug = rawTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60);
      const scopePart =
        zipScope === "deliveryGroup" && deliveryGroup ? `${zipScope}-${deliveryGroup}` : zipScope;
      const zipFilename = `brightline-gallery-${slug}-${scopePart}-${quality === "low" ? "web" : "full"}.zip`;

      try {
        return createR2KeysZipResponse(entries, zipFilename);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "ZIP failed.";
        return NextResponse.json({ ok: false, error: msg }, { status: 500 });
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
