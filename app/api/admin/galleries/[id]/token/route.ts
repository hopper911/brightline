import { NextResponse } from "next/server";
import type { GalleryStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { randomInt } from "crypto";
import { hashAccessCode, verifyAccessCode } from "@/lib/client-access";
import { getAdminGalleryDetail } from "@/lib/admin-gallery-detail";

export const runtime = "nodejs";

/** 5-digit numeric codes (10000–99999) for easy client entry. */
function generateNumericAccessCode(): string {
  return String(randomInt(10_000, 100_000));
}

async function isPlaintextUniqueAmongGalleryActives(
  galleryId: string,
  plaintext: string
): Promise<boolean> {
  const tokens = await prisma.galleryAccessToken.findMany({
    where: { galleryId, isActive: true },
    select: { codeHash: true, codeSalt: true },
  });
  return !tokens.some((t) => verifyAccessCode(plaintext, t.codeHash, t.codeSalt));
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

  const galleryRow = await prisma.gallery.findUnique({
    where: { id },
    select: { galleryType: true, status: true, sentAt: true },
  });
  if (!galleryRow) {
    return NextResponse.json({ ok: false, error: "Gallery not found." }, { status: 404 });
  }

  let token = "";
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const candidate = generateNumericAccessCode();
    if (await isPlaintextUniqueAmongGalleryActives(id, candidate)) {
      token = candidate;
      break;
    }
  }
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Could not allocate a unique access code. Try again." },
      { status: 503 }
    );
  }

  const hashed = hashAccessCode(token);

  await prisma.$transaction(async (tx) => {
    const nextStatus: GalleryStatus | undefined =
      galleryRow.status === "DRAFT" || galleryRow.status === "READY_TO_SEND"
        ? "SENT"
        : undefined;

    if (nextStatus) {
      await tx.gallery.update({
        where: { id },
        data: {
          status: nextStatus,
          sentAt: galleryRow.sentAt ?? new Date(),
        },
      });
    }

    // Single active token per gallery: revoke previous actives when issuing a new code.
    await tx.galleryAccessToken.updateMany({
      where: { galleryId: id, isActive: true },
      data: { isActive: false },
    });

    await tx.galleryAccessToken.create({
      data: {
        galleryId: id,
        codeHash: hashed.hash,
        codeSalt: hashed.salt,
        codeHint: hashed.hint,
        label: typeof body.label === "string" ? body.label.trim() || null : null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        allowDownload:
          typeof body.allowDownload === "boolean"
            ? body.allowDownload
            : galleryRow.galleryType === "FINAL_DELIVERY",
        maxDownloads:
          body.maxDownloads === null
            ? null
            : typeof body.maxDownloads === "number" && Number.isFinite(body.maxDownloads)
              ? Math.max(0, Math.trunc(body.maxDownloads))
              : null,
        isActive: true,
      },
    });
  });

  const gallery = await getAdminGalleryDetail(id);
  return NextResponse.json({ ok: true, token, gallery });
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
