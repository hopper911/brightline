import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

function generateToken() {
  return randomBytes(8).toString("hex").toUpperCase();
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = (await req.json()) as { expiresAt?: string };

  const token = generateToken();

  const accessToken = await prisma.galleryAccessToken.create({
    data: {
      galleryId: id,
      token,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    },
  });

  return NextResponse.json({ ok: true, token: accessToken.token });
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = (await req.json()) as { tokenId?: string };
  if (!body.tokenId) {
    return NextResponse.json(
      { ok: false, error: "Token id required." },
      { status: 400 }
    );
  }
  await prisma.galleryAccessToken.deleteMany({
    where: { id: body.tokenId, galleryId: id },
  });
  return NextResponse.json({ ok: true });
}
