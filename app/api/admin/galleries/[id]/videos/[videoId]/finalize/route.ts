import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { getAdminGalleryDetail } from "@/lib/admin-gallery-detail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string; videoId: string }> }
) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id, videoId } = await context.params;
  const body = (await req.json().catch(() => ({}))) as {
    title?: string | null;
    posterKey?: string | null;
    allowDownload?: boolean;
  };

  await prisma.galleryVideo.updateMany({
    where: { id: videoId, galleryId: id },
    data: {
      title: body.title === undefined ? undefined : body.title?.trim() || null,
      posterKey: body.posterKey === undefined ? undefined : body.posterKey?.trim() || null,
      allowDownload:
        typeof body.allowDownload === "boolean" ? body.allowDownload : undefined,
    },
  });

  const gallery = await getAdminGalleryDetail(id);
  return NextResponse.json({ ok: true, gallery });
}
