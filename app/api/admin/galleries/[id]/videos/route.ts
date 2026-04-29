import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { getClientUploadUrl } from "@/lib/image-strategy";
import { getAdminGalleryDetail } from "@/lib/admin-gallery-detail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await req.json()) as {
    filename?: string;
    contentType?: string;
    title?: string;
    sortOrder?: number;
  };
  if (!body.filename) {
    return NextResponse.json({ ok: false, error: "Filename required." }, { status: 400 });
  }
  const contentType = body.contentType || "video/mp4";
  if (!contentType.startsWith("video/")) {
    return NextResponse.json({ ok: false, error: "Only video uploads are supported." }, { status: 400 });
  }

  const safeName = body.filename.replace(/[^\w.-]/g, "-");
  const key = `client-galleries/${id}/videos/${Date.now()}-${safeName}`;
  const upload = await getClientUploadUrl({ key, contentType });
  const video = await prisma.galleryVideo.create({
    data: {
      galleryId: id,
      title: body.title?.trim() || null,
      filename: safeName,
      storageKey: key,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
    },
  });

  return NextResponse.json({ ok: true, video, upload });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await req.json()) as {
    order?: string[];
    videoId?: string;
    title?: string | null;
    allowDownload?: boolean;
  };

  if (Array.isArray(body.order)) {
    const ids = body.order.filter((v) => typeof v === "string");
    await Promise.all(
      ids.map((videoId, index) =>
        prisma.galleryVideo.updateMany({
          where: { id: videoId, galleryId: id },
          data: { sortOrder: index },
        })
      )
    );
  }

  if (body.videoId) {
    await prisma.galleryVideo.updateMany({
      where: { id: body.videoId, galleryId: id },
      data: {
        title: body.title === undefined ? undefined : body.title?.trim() || null,
        allowDownload:
          typeof body.allowDownload === "boolean" ? body.allowDownload : undefined,
      },
    });
  }

  const gallery = await getAdminGalleryDetail(id);
  return NextResponse.json({ ok: true, gallery });
}
