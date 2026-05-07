import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  clientGallerySessionErrorResponse,
  guardImageInClientGallery,
} from "@/lib/client-api/gallery-scope";
import { isGalleryViewableByClient } from "@/lib/gallery-client-delivery";
import { jsonErr, jsonOk } from "@/lib/api/http";
import { loadClientGallerySession } from "@/lib/client-gallery-session";
import { recordEngagementEvent } from "@/lib/engagement/recordEvent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      imageId?: string;
      action?: "add" | "remove";
      note?: string;
    };

    const loaded = await loadClientGallerySession();
    if (!loaded.ok) {
      return clientGallerySessionErrorResponse(loaded);
    }

    const badImage = guardImageInClientGallery(loaded, body.imageId);
    if (badImage) return badImage;

    const imageId = body.imageId!.trim();
    const action = body.action === "remove" ? "remove" : "add";
    const { note } = body;
    const access = loaded.access;

    if (!isGalleryViewableByClient(access.gallery)) {
      return jsonErr("Gallery is not available.", 403);
    }

    const jar = await cookies();
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

      await prisma.galleryAccessLog.create({
        data: {
          tokenId: access.id,
          action: "favorite",
          imageId,
        },
      });
      recordEngagementEvent({
        surface: "client_gallery",
        eventType: "gallery.favorite",
        studioProjectId: access.gallery.studioProjectId,
        galleryId: access.gallery.id,
        galleryAccessTokenId: access.id,
        imageId,
        meta: note ? { hasNote: true } : undefined,
      });
    } else {
      await prisma.galleryFavorite.deleteMany({
        where: {
          tokenId: access.id,
          imageId,
        },
      });

      await prisma.galleryAccessLog.create({
        data: {
          tokenId: access.id,
          action: "unfavorite",
          imageId,
        },
      });
      recordEngagementEvent({
        surface: "client_gallery",
        eventType: "gallery.unfavorite",
        studioProjectId: access.gallery.studioProjectId,
        galleryId: access.gallery.id,
        galleryAccessTokenId: access.id,
        imageId,
      });
    }

    return jsonOk({ action });
  } catch {
    return jsonErr("Failed to update favorite.", 500);
  }
}
