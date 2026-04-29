import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const isAdmin = await authorizeAdminRequest(_req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;

  const tokens = await prisma.galleryAccessToken.findMany({
    where: { galleryId: id },
    select: { id: true, codeHint: true, label: true },
  });
  const tokenIds = tokens.map((t) => t.id);
  if (tokenIds.length === 0) {
    return NextResponse.json({ ok: true, logs: [], downloads: [], tokens: [] });
  }

  const [logs, downloads] = await Promise.all([
    prisma.galleryAccessLog.findMany({
      where: { tokenId: { in: tokenIds } },
      orderBy: { createdAt: "desc" },
      take: 120,
    }),
    prisma.galleryDownload.findMany({
      where: { tokenId: { in: tokenIds } },
      orderBy: { id: "desc" },
      take: 120,
      include: { token: { select: { codeHint: true, label: true } } },
    }),
  ]);

  const tokenMap = new Map(tokens.map((t) => [t.id, t]));

  return NextResponse.json({
    ok: true,
    tokens,
    logs: logs.map((l) => ({
      id: l.id,
      action: l.action,
      imageId: l.imageId,
      ip: l.ip,
      createdAt: l.createdAt.toISOString(),
      codeHint: l.tokenId ? tokenMap.get(l.tokenId)?.codeHint ?? null : null,
    })),
    downloads: downloads.map((d) => ({
      id: d.id,
      type: d.type,
      imageId: d.imageId,
      codeHint: d.token?.codeHint ?? null,
      tokenLabel: d.token?.label ?? null,
    })),
  });
}
