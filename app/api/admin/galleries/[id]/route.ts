import { NextResponse } from "next/server";
import type { GalleryStatus, GalleryType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { getAdminGalleryDetail } from "@/lib/admin-gallery-detail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GALLERY_STATUSES: readonly GalleryStatus[] = [
  "DRAFT",
  "READY_TO_SEND",
  "SENT",
  "CLIENT_REVIEWING",
  "SELECTIONS_RECEIVED",
  "FINALIZED",
  "DELIVERED",
  "EXPIRED",
  "ARCHIVED",
];

const GALLERY_TYPES: readonly GalleryType[] = [
  "PROOF",
  "SELECTION",
  "FINAL_DELIVERY",
  "INTERNAL_REVIEW",
];

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;

  const gallery = await getAdminGalleryDetail(id);

  if (!gallery) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, gallery });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await context.params;
  const body = (await req.json()) as {
    title?: string;
    slug?: string;
    description?: string | null;
    coverUrl?: string | null;
    clientNotes?: string | null;
    internalNotes?: string | null;
    published?: boolean;
    clientId?: string | null;
    projectId?: string | null;
    studioProjectId?: string | null;
    status?: GalleryStatus;
    galleryType?: GalleryType;
    sentAt?: string | null;
  };

  const status =
    body.status !== undefined && GALLERY_STATUSES.includes(body.status)
      ? body.status
      : undefined;
  const galleryType =
    body.galleryType !== undefined && GALLERY_TYPES.includes(body.galleryType)
      ? body.galleryType
      : undefined;

  await prisma.gallery.update({
    where: { id },
    data: {
      title: body.title ?? undefined,
      slug: body.slug ?? undefined,
      description: body.description ?? undefined,
      coverUrl: body.coverUrl ?? undefined,
      clientNotes: body.clientNotes ?? undefined,
      internalNotes: body.internalNotes ?? undefined,
      published:
        typeof body.published === "boolean" ? body.published : undefined,
      clientId: body.clientId ?? undefined,
      projectId: body.projectId ?? undefined,
      studioProjectId:
        body.studioProjectId === undefined ? undefined : body.studioProjectId,
      ...(status !== undefined ? { status } : {}),
      ...(galleryType !== undefined ? { galleryType } : {}),
      sentAt:
        body.sentAt === undefined
          ? undefined
          : body.sentAt === null
            ? null
            : new Date(body.sentAt),
    },
  });

  const gallery = await getAdminGalleryDetail(id);

  return NextResponse.json({ ok: true, gallery });
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
  await prisma.gallery.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
