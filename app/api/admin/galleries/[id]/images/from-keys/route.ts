import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { getAdminGalleryDetail } from "@/lib/admin-gallery-detail";
import { generateLowResForGalleryImage } from "@/lib/gallery-delivery-assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Keys under R2 that we attach as gallery stills (finalize uses sharp). */
const IMAGE_KEY = /\.(jpe?g|png|webp|gif|avif)$/i;

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await req.json()) as { keys?: unknown };
  const raw = Array.isArray(body.keys) ? body.keys : [];
  const keys = raw
    .map((k) => String(k).trim().replace(/^\//, ""))
    .filter((k) => k.length > 0 && !k.includes(".."))
    .slice(0, 80);

  if (!keys.length) {
    return NextResponse.json({ ok: false, error: "No valid keys provided." }, { status: 400 });
  }

  const gallery = await prisma.gallery.findUnique({ where: { id }, select: { id: true } });
  if (!gallery) {
    return NextResponse.json({ ok: false, error: "Gallery not found." }, { status: 404 });
  }

  const imageKeys = keys.filter((k) => IMAGE_KEY.test(k));
  if (!imageKeys.length) {
    return NextResponse.json(
      { ok: false, error: "No image keys (jpeg, png, webp, gif, avif)." },
      { status: 400 }
    );
  }

  const maxRow = await prisma.galleryImage.aggregate({
    where: { galleryId: id },
    _max: { sortOrder: true },
  });
  let sortOrder = (maxRow._max.sortOrder ?? -1) + 1;

  const createdIds: string[] = [];
  await prisma.$transaction(async (tx) => {
    for (const storageKey of imageKeys) {
      const filename = storageKey.split("/").pop() || "image";
      const row = await tx.galleryImage.create({
        data: {
          galleryId: id,
          url: "",
          filename,
          storageKey,
          sortOrder,
        },
      });
      sortOrder += 1;
      createdIds.push(row.id);
    }
  });

  for (const imageId of createdIds) {
    try {
      await generateLowResForGalleryImage(imageId);
    } catch {
      // Non-image or corrupt object in R2 — row still created; admin can remove.
    }
  }

  const detail = await getAdminGalleryDetail(id);
  return NextResponse.json({
    ok: true,
    created: createdIds.length,
    gallery: detail,
  });
}
