import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const take = Math.min(Number(searchParams.get("limit") || 80), 200);

  const [logs, downloads] = await Promise.all([
    prisma.galleryAccessLog.findMany({
      where: { tokenId: { not: null } },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        token: {
          include: { gallery: { select: { id: true, title: true, slug: true } } },
        },
      },
    }),
    prisma.galleryDownload.findMany({
      orderBy: { id: "desc" },
      take,
      include: {
        token: {
          include: { gallery: { select: { id: true, title: true, slug: true } } },
        },
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    logs: logs.map((l) => ({
      id: l.id,
      action: l.action,
      imageId: l.imageId,
      ip: l.ip,
      createdAt: l.createdAt.toISOString(),
      galleryTitle: l.token?.gallery?.title ?? null,
      galleryId: l.token?.gallery?.id ?? null,
      codeHint: l.token?.codeHint ?? null,
    })),
    downloads: downloads.map((d) => ({
      id: d.id,
      type: d.type,
      imageId: d.imageId,
      galleryTitle: d.token?.gallery?.title ?? null,
      galleryId: d.token?.gallery?.id ?? null,
      codeHint: d.token?.codeHint ?? null,
    })),
  });
}
