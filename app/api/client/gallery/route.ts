import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gallerySupportsSelectionWorkflow } from "@/lib/gallery-client-delivery";
import { loadClientGallerySession } from "@/lib/client-gallery-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getClientIp(req: Request): string | null {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return null;
}

export async function POST(req: Request) {
  try {
    await req.json();
    const loaded = await loadClientGallerySession();
    if (!loaded.ok) {
      return NextResponse.json(
        { ok: false, error: loaded.error },
        { status: loaded.status }
      );
    }

    const { access } = loaded;

    if (access.gallery.status === "SENT") {
      void prisma.gallery
        .update({
          where: { id: access.gallery.id },
          data: { status: "CLIENT_REVIEWING" },
        })
        .catch(() => {});
    }

    await prisma.galleryAccessToken.update({
      where: { id: access.id },
      data: { lastUsedAt: new Date() },
    });

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

    const selectionRows = await prisma.galleryImageSelection.findMany({
      where: { tokenId: access.id },
    });
    const selectedMap = new Map(
      selectionRows.map((r) => [r.imageId, r.selected])
    );

    const selectionsLocked = Boolean(access.selectionsSubmittedAt);
    const workflowEnabled = gallerySupportsSelectionWorkflow(gallery);
    const showSelectionTools =
      workflowEnabled && !selectionsLocked && gallery.status !== "FINALIZED";

    let missingPrivate = 0;
    const { getClientDownloadUrl } = await import("@/lib/image-strategy");
    const images = await Promise.all(
      gallery.images.map(async (image) => {
        const base = {
          id: image.id,
          alt: image.alt,
          filename: image.filename,
          sortOrder: image.sortOrder,
          isHero: image.isHero ?? false,
          isFavorite: favoriteImageIds.has(image.id),
          isSelected: selectedMap.get(image.id) ?? false,
          meta: image.meta ?? null,
        };

        if (!image.storageKey && !image.lowResStorageKey && !image.thumbUrl && !image.fullUrl) {
          missingPrivate += 1;
          return {
            ...base,
            url: image.url,
            thumbUrl: image.thumbUrl ?? image.url,
            fullUrl: image.fullUrl ?? image.url,
            hasFullRes: false,
            hasLowRes: false,
          };
        }

        const lowSigned = image.lowResStorageKey
          ? await getClientDownloadUrl({ key: image.lowResStorageKey })
          : null;
        const highSigned = image.storageKey
          ? await getClientDownloadUrl({ key: image.storageKey })
          : null;
        const resolvedUrl = lowSigned?.url ?? highSigned?.url ?? image.url;

        return {
          ...base,
          url: resolvedUrl,
          thumbUrl: image.thumbUrl ?? resolvedUrl,
          fullUrl: highSigned?.url ?? image.fullUrl ?? resolvedUrl,
          hasFullRes: Boolean(image.storageKey),
          hasLowRes: Boolean(image.lowResStorageKey),
          highResWidth: image.highResWidth,
          highResHeight: image.highResHeight,
          lowResWidth: image.lowResWidth,
          lowResHeight: image.lowResHeight,
        };
      })
    );
    const videos = await Promise.all(
      gallery.videos.map(async (video) => {
        const signed = await getClientDownloadUrl({ key: video.storageKey });
        const poster = video.posterKey ? await getClientDownloadUrl({ key: video.posterKey }) : null;
        return {
          id: video.id,
          title: video.title,
          filename: video.filename,
          url: signed.url,
          posterUrl: poster?.url ?? null,
          allowDownload: video.allowDownload,
          sortOrder: video.sortOrder,
        };
      })
    );

    const selectedCount = images.filter((img) => img.isSelected).length;

    return NextResponse.json({
      ok: true,
      gallery: {
        id: gallery.id,
        title: gallery.title,
        slug: gallery.slug,
        description: gallery.description,
        clientNotes: gallery.clientNotes,
        galleryType: gallery.galleryType,
        deliveryDriveLink: gallery.deliveryDriveLink,
        usageGuideText: gallery.usageGuideText,
        deliveredAt: gallery.deliveredAt?.toISOString() ?? null,
        coverUrl: gallery.coverUrl,
        clientName: gallery.client?.name ?? null,
        projectTitle: gallery.project?.title ?? null,
        images: images.filter(Boolean),
        videos,
        allowDownload: access.allowDownload && missingPrivate === 0,
        expiresAt: access.expiresAt?.toISOString() ?? null,
        selectionWorkflow: workflowEnabled,
        showSelectionTools,
        selectionsLocked,
        selectionsSubmittedAt:
          access.selectionsSubmittedAt?.toISOString() ?? null,
        selectedCount,
      },
      tokenId: access.id,
      warning:
        missingPrivate > 0
          ? "Some images use public URLs and are not available for download."
          : null,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to load gallery." },
      { status: 500 }
    );
  }
}
