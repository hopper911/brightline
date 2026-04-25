import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gallerySupportsSelectionWorkflow } from "@/lib/gallery-client-delivery";
import {
  imageBelongsToGallery,
  loadClientGallerySession,
} from "@/lib/client-gallery-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action?: "toggle" | "submit";
      imageId?: string;
      selected?: boolean;
    };
    const action = body.action;

    const loaded = await loadClientGallerySession();
    if (!loaded.ok) {
      return NextResponse.json(
        { ok: false, error: loaded.error },
        { status: loaded.status }
      );
    }

    const { access } = loaded;
    const gallery = access.gallery;

    if (!gallerySupportsSelectionWorkflow(gallery)) {
      return NextResponse.json(
        { ok: false, error: "Selections are not enabled for this gallery." },
        { status: 400 }
      );
    }

    if (access.selectionsSubmittedAt) {
      return NextResponse.json(
        { ok: false, error: "Selections have already been submitted." },
        { status: 400 }
      );
    }

    if (gallery.status === "FINALIZED" || gallery.status === "DELIVERED") {
      return NextResponse.json(
        { ok: false, error: "This gallery is locked." },
        { status: 400 }
      );
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

      return NextResponse.json({ ok: true, submitted: true });
    }

    if (action === "toggle") {
      const imageId = body.imageId?.trim();
      if (!imageId) {
        return NextResponse.json(
          { ok: false, error: "imageId is required." },
          { status: 400 }
        );
      }
      if (!imageBelongsToGallery(gallery, imageId)) {
        return NextResponse.json(
          { ok: false, error: "Invalid image." },
          { status: 400 }
        );
      }

      const selected = Boolean(body.selected);

      await prisma.galleryImageSelection.upsert({
        where: {
          tokenId_imageId: { tokenId: access.id, imageId },
        },
        create: {
          tokenId: access.id,
          imageId,
          selected,
        },
        update: { selected },
      });

      await prisma.galleryAccessLog.create({
        data: {
          tokenId: access.id,
          action: selected ? "select" : "unselect",
          imageId,
        },
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { ok: false, error: "Invalid action." },
      { status: 400 }
    );
  } catch (e) {
    console.error("CLIENT_SELECTION_ERROR", e);
    return NextResponse.json(
      { ok: false, error: "Unable to update selection." },
      { status: 500 }
    );
  }
}
