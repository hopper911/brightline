import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id: galleryId } = await context.params;

  let body: { order?: string[]; heroImageId?: string | null };
  try {
    body = (await req.json()) as { order?: string[]; heroImageId?: string | null };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const order = Array.isArray(body.order) ? body.order.filter((x) => typeof x === "string") : [];
  const heroImageId =
    body.heroImageId === undefined
      ? undefined
      : body.heroImageId === null
        ? null
        : String(body.heroImageId).trim() || null;

  const gallery = await prisma.gallery.findUnique({
    where: { id: galleryId },
    select: { id: true },
  });
  if (!gallery) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    if (order.length) {
      // Only update images that belong to this gallery.
      const images = await tx.galleryImage.findMany({
        where: { galleryId },
        select: { id: true },
      });
      const allowed = new Set(images.map((i) => i.id));
      const filtered = order.filter((id) => allowed.has(id));

      await Promise.all(
        filtered.map((id, idx) =>
          tx.galleryImage.update({
            where: { id },
            data: { sortOrder: idx },
          })
        )
      );
    }

    if (heroImageId !== undefined) {
      await tx.galleryImage.updateMany({
        where: { galleryId },
        data: { isHero: false },
      });
      if (heroImageId) {
        await tx.galleryImage.updateMany({
          where: { galleryId, id: heroImageId },
          data: { isHero: true },
        });
      }
    }
  });

  const images = await prisma.galleryImage.findMany({
    where: { galleryId },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ ok: true, images });
}

