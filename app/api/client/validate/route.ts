import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json()) as { token?: string };
  const token = body.token?.trim();

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Access code is required." },
      { status: 400 }
    );
  }

  const access = await prisma.galleryAccessToken.findUnique({
    where: { token },
    include: { gallery: true },
  });

  if (!access || !access.gallery) {
    return NextResponse.json(
      { ok: false, error: "That access code is not valid." },
      { status: 404 }
    );
  }

  if (access.expiresAt && access.expiresAt.getTime() < Date.now()) {
    return NextResponse.json(
      { ok: false, error: "That access code has expired." },
      { status: 410 }
    );
  }

  return NextResponse.json({ ok: true, token, galleryId: access.gallery.id });
}
