import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { randomBytes } from "crypto";
import { hashAccessCode } from "@/lib/client-access";

export const runtime = "nodejs";

function generateToken() {
  return randomBytes(8).toString("hex").toUpperCase();
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await context.params;
  let body: {
    expiresAt?: string;
    label?: string;
    allowDownload?: boolean;
    maxDownloads?: number | null;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    // Empty or invalid body - use defaults
  }

  const token = generateToken();
  const hashed = hashAccessCode(token);

  await prisma.galleryAccessToken.create({
    data: {
      galleryId: id,
      codeHash: hashed.hash,
      codeSalt: hashed.salt,
      codeHint: hashed.hint,
      label: typeof body.label === "string" ? body.label.trim() || null : null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      allowDownload: typeof body.allowDownload === "boolean" ? body.allowDownload : false,
      maxDownloads:
        body.maxDownloads === null
          ? null
          : typeof body.maxDownloads === "number" && Number.isFinite(body.maxDownloads)
            ? Math.max(0, Math.trunc(body.maxDownloads))
            : null,
      isActive: true,
    },
  });

  return NextResponse.json({ ok: true, token });
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await context.params;
  const body = (await req.json()) as { tokenId?: string };
  if (!body.tokenId) {
    return NextResponse.json(
      { ok: false, error: "Token id required." },
      { status: 400 }
    );
  }
  await prisma.galleryAccessToken.updateMany({
    where: { id: body.tokenId, galleryId: id },
    data: { isActive: false },
  });
  return NextResponse.json({ ok: true });
}
