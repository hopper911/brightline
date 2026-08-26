import { prisma } from "@/lib/prisma";
import { clientSelectionBodySchema } from "@/lib/api/client-package-schemas";
import { jsonErr, jsonOk } from "@/lib/api/http";
import { parseJsonWithSchema } from "@/lib/api/parse";
import { gallerySupportsSelectionWorkflow } from "@/lib/gallery-client-delivery";
import {
  imageBelongsToGallery,
  loadClientGallerySession,
} from "@/lib/client-gallery-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const parsed = await parseJsonWithSchema(req, clientSelectionBodySchema);
    if (!parsed.ok) return parsed.response;

    const { action, selected } = parsed.data;

    const loaded = await loadClientGallerySession();
    if (!loaded.ok) {
      return jsonErr(loaded.error, loaded.status);
    }

    const { access } = loaded;
    const gallery = access.gallery;

    if (!gallerySupportsSelectionWorkflow(gallery)) {
      return jsonErr("Selections are not enabled for this gallery.", 400);
    }

    if (access.selectionsSubmittedAt) {
      return jsonErr("Selections have already been submitted.", 400);
    }

    if (gallery.status === "FINALIZED" || gallery.status === "DELIVERED") {
      return jsonErr("This gallery is locked.", 400);
    }

    if (action === "submit") {
      const nextStatus =
        gallery.status === "SENT" || gallery.status === "CLIENT_REVIEWING"
          ? "SELECTIONS_RECEIVED"
          : gallery.status;

      await prisma.$transaction([
        prisma.galleryAccessToken.update({
          where: { id: access.id },
          data: { selectionsSubmittedAt: new Date() },
        }),
        prisma.gallery.update({
          where: { id: gallery.id },
          data: { status: nextStatus },
        }),
        prisma.galleryAccessLog.create({
          data: {
            tokenId: access.id,
            action: "selections_submit",
          },
        }),
      ]);

      return jsonOk({ submitted: true });
    }

    const imageId = parsed.data.imageId?.trim();
    if (!imageId) {
      return jsonErr("imageId is required.", 400, { code: "validation_error" });
    }
    if (!imageBelongsToGallery(gallery, imageId)) {
      return jsonErr("Invalid image.", 400);
    }

    const selectedFlag = Boolean(selected);

    await prisma.galleryImageSelection.upsert({
      where: {
        tokenId_imageId: { tokenId: access.id, imageId },
      },
      create: {
        tokenId: access.id,
        imageId,
        selected: selectedFlag,
      },
      update: { selected: selectedFlag },
    });

    await prisma.galleryAccessLog.create({
      data: {
        tokenId: access.id,
        action: selectedFlag ? "select" : "unselect",
        imageId,
      },
    });

    return jsonOk({});
  } catch (e) {
    console.error("CLIENT_SELECTION_ERROR", e);
    return jsonErr("Unable to update selection.", 500);
  }
}
