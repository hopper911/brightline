import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const items = await prisma.galleryAccessToken.findMany({
    include: { gallery: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    token?: string;
    galleryId?: string;
    expiresAt?: string;
  };

  if (!body.token || !body.galleryId) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields." },
      { status: 400 }
    );
  }

  const item = await prisma.galleryAccessToken.create({
    data: {
      token: body.token,
      galleryId: body.galleryId,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    },
    include: { gallery: true },
  });

  return NextResponse.json({ ok: true, item });
}
