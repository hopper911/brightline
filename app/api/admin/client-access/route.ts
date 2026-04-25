import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashAccessCode } from "@/lib/client-access";
import { authorizeAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const items = await prisma.galleryAccessToken.findMany({
    include: { gallery: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

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

  const hashed = hashAccessCode(body.token.trim());
  const item = await prisma.galleryAccessToken.create({
    data: {
      codeHash: hashed.hash,
      codeSalt: hashed.salt,
      codeHint: hashed.hint,
      galleryId: body.galleryId,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      isActive: true,
    },
    include: { gallery: true },
  });

  return NextResponse.json({ ok: true, item });
}
