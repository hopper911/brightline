import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { generateLowResForGalleryImage } from "@/lib/gallery-delivery-assets";
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
  const body = (await req.json().catch(() => ({}))) as { imageId?: string };
  const imageId = body.imageId?.trim();
  if (!imageId) {
    return NextResponse.json({ ok: false, error: "imageId is required." }, { status: 400 });
  }

  try {
    const image = await generateLowResForGalleryImage(imageId);
    if (image.galleryId !== id) {
      return NextResponse.json({ ok: false, error: "Image does not belong to gallery." }, { status: 400 });
    }
    const gallery = await getAdminGalleryDetail(id);
    return NextResponse.json({ ok: true, image, gallery });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to finalize image.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
