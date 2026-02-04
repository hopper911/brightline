import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json()) as { code?: string };
  const token = body.code?.trim();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing access code." },
      { status: 400 }
    );
  }

  const entry = await prisma.galleryAccessToken.findUnique({
    where: { token },
  });

  if (!entry) {
    return NextResponse.json(
      { ok: false, error: "Invalid access code." },
      { status: 401 }
    );
  }

  if (entry.expiresAt && entry.expiresAt.getTime() < Date.now()) {
    return NextResponse.json(
      { ok: false, error: "That access code has expired." },
      { status: 410 }
    );
  }

  return NextResponse.json({ ok: true, url: `/client/${token}` });
}
