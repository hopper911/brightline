import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { getClientUploadUrl } from "@/lib/image-strategy";
import { prisma } from "@/lib/prisma";

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
  const body = (await req.json()) as { filename?: string; contentType?: string };
  if (!body.filename) {
    return NextResponse.json({ ok: false, error: "Filename required." }, { status: 400 });
  }

  const exists = await prisma.galleryVideo.findFirst({
    where: { id: videoId, galleryId: id },
    select: { id: true },
  });
  if (!exists) {
    return NextResponse.json({ ok: false, error: "Video not found." }, { status: 404 });
  }

  const safeName = body.filename.replace(/[^\w.-]/g, "-");
  const key = `client-galleries/${id}/video-posters/${videoId}-${Date.now()}-${safeName}`;
  const upload = await getClientUploadUrl({
    key,
    contentType: body.contentType || "image/jpeg",
  });

  return NextResponse.json({ ok: true, posterKey: key, upload });
}
