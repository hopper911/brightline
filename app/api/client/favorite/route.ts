import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  clientGallerySessionErrorResponse,
  guardImageInClientGallery,
} from "@/lib/client-api/gallery-scope";
import { isGalleryViewableByClient } from "@/lib/gallery-client-delivery";
import { clientFavoriteBodySchema } from "@/lib/api/client-package-schemas";
import { jsonErr, jsonOk } from "@/lib/api/http";
import { parseJsonWithSchema } from "@/lib/api/parse";
import { loadClientGallerySession } from "@/lib/client-gallery-session";
import { shouldUseSecureCookies } from "@/lib/cookie-secure";
import { recordEngagementEvent } from "@/lib/engagement/recordEvent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const parsed = await parseJsonWithSchema(req, clientFavoriteBodySchema);
    if (!parsed.ok) return parsed.response;

    const loaded = await loadClientGallerySession();
    if (!loaded.ok) {
      return clientGallerySessionErrorResponse(loaded);
    }

    const badImage = guardImageInClientGallery(loaded, parsed.data.imageId);
    if (badImage) return badImage;

    const imageId = parsed.data.imageId.trim();
    const action = parsed.data.action === "remove" ? "remove" : "add";
    const note = parsed.data.note;
    const access = loaded.access;

    if (!isGalleryViewableByClient(access.gallery)) {
      return jsonErr("Gallery is not available.", 403);
    }

    const jar = await cookies();
    const secure = shouldUseSecureCookies(req);
    jar.set("client_access", "true", {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure,
      maxAge: 60 * 60 * 24 * 7,
    });
    jar.set("client_access_id", "", {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure,
      maxAge: 0,
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
